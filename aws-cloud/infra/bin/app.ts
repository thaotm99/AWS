#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { StaticSiteStack } from "../lib/static-site-stack";

const app = new App();
const ctx = (key: string) => app.node.tryGetContext(key);

new StaticSiteStack(app, "AwsTuNenSite", {
  // Singapore: the closest Region to learners in Vietnam (see the Global Infrastructure lesson).
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? "ap-southeast-1" },
  githubRepo: ctx("githubRepo"),
  githubBranch: ctx("githubBranch"),
  createGithubOidcProvider: String(ctx("createGithubOidcProvider")) !== "false",
  budgetEmail: ctx("budgetEmail"),
  monthlyBudgetUsd: Number(ctx("monthlyBudgetUsd")),
  tags: { project: "aws-tu-nen" },
});
