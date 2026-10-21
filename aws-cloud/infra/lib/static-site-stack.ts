import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

export interface StaticSiteStackProps extends StackProps {
  /** "owner/repo" allowed to deploy through GitHub Actions OIDC. */
  githubRepo: string;
  /** Only workflows running on this branch may assume the deploy role. */
  githubBranch: string;
  /** An account holds one GitHub OIDC provider; set false if it already exists. */
  createGithubOidcProvider: boolean;
  /** Email for the monthly cost alarm; no budget is created when omitted. */
  budgetEmail?: string;
  monthlyBudgetUsd: number;
}

const GITHUB_OIDC_HOST = "token.actions.githubusercontent.com";

// Astro emits /concepts/<id>/index.html; S3 behind OAC has no index documents,
// so map directory-style URLs to their index.html at the edge.
const INDEX_REWRITE = `
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
  } else if (uri.lastIndexOf(".") < uri.lastIndexOf("/")) {
    request.uri = uri + "/index.html";
  }
  return request;
}`;

export class StaticSiteStack extends Stack {
  constructor(scope: Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      // Site files are rebuilt from git, but keep the bucket if the stack is deleted by mistake.
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const indexRewrite = new cloudfront.Function(this, "IndexRewrite", {
      code: cloudfront.FunctionCode.fromInline(INDEX_REWRITE),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: "Map /path/ to /path/index.html",
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: "AWS Tu Nen learning site",
      defaultRootObject: "index.html",
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      // Covers edge locations in Asia, including Vietnam, at lower cost than PriceClass_All.
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
        functionAssociations: [{ function: indexRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
      // Without s3:ListBucket, S3 answers a missing key with 403 rather than 404.
      errorResponses: [403, 404].map((httpStatus) => ({
        httpStatus,
        responseHttpStatus: 404,
        responsePagePath: "/404.html",
        ttl: Duration.minutes(5),
      })),
    });

    const providerArn = props.createGithubOidcProvider
      ? new iam.OpenIdConnectProvider(this, "GithubOidc", {
          url: `https://${GITHUB_OIDC_HOST}`,
          clientIds: ["sts.amazonaws.com"],
        }).openIdConnectProviderArn
      : `arn:aws:iam::${this.account}:oidc-provider/${GITHUB_OIDC_HOST}`;

    const deployRole = new iam.Role(this, "GithubDeployRole", {
      description: `GitHub Actions deploy for ${props.githubRepo}@${props.githubBranch}`,
      maxSessionDuration: Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(providerArn, {
        StringEquals: { [`${GITHUB_OIDC_HOST}:aud`]: "sts.amazonaws.com" },
        StringLike: { [`${GITHUB_OIDC_HOST}:sub`]: `repo:${props.githubRepo}:ref:refs/heads/${props.githubBranch}` },
      }),
    });
    // s3 sync --delete needs list, put and delete on this bucket only.
    bucket.grantReadWrite(deployRole);
    bucket.grantDelete(deployRole);
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"],
        resources: [`arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`],
      }),
    );

    if (props.budgetEmail) {
      const alert = (notificationType: string, threshold: number) => ({
        notification: { notificationType, comparisonOperator: "GREATER_THAN", threshold, thresholdType: "PERCENTAGE" },
        subscribers: [{ subscriptionType: "EMAIL", address: props.budgetEmail! }],
      });
      new budgets.CfnBudget(this, "MonthlyBudget", {
        budget: {
          budgetName: "aws-tu-nen-monthly",
          budgetType: "COST",
          timeUnit: "MONTHLY",
          budgetLimit: { amount: props.monthlyBudgetUsd, unit: "USD" },
        },
        notificationsWithSubscribers: [alert("ACTUAL", 80), alert("FORECASTED", 100)],
      });
    }

    new CfnOutput(this, "SiteUrl", { value: `https://${distribution.distributionDomainName}` });
    new CfnOutput(this, "SiteBucketName", { value: bucket.bucketName });
    new CfnOutput(this, "DistributionId", { value: distribution.distributionId });
    new CfnOutput(this, "DeployRoleArn", { value: deployRole.roleArn });
  }
}
