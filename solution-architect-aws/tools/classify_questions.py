"""Phân loại 390 câu trong 6 đề luyện thi theo service và ghi {service}/list_qa.md.

Chạy từ folder solution-architect-aws/:
    python3 tools/classify_questions.py            # in số câu mỗi nhóm, không ghi file
    python3 tools/classify_questions.py --write    # ghi lại list_qa.md cho các nhóm tự động

Một câu thuộc service khi tên service xuất hiện trong đề bài hoặc trong đáp án đúng
(không tính đáp án sai). s3/, dynamodb/, global-infra/ là danh sách soạn tay nên không bị ghi đè.
keyword.md không sinh tự động: viết tay sau khi đọc các câu trong list_qa.md.
"""
import glob
import json
import os
import re
import sys

from bs4 import BeautifulSoup

MANUAL = {"s3", "dynamodb", "global-infra"}


def load_questions(folder="."):
    out = []
    for path in sorted(glob.glob(os.path.join(folder, "00* Quiz Practice Test*.html"))):
        n = int(re.search(r"Test #(\d)", path).group(1))
        raw = open(path, encoding="utf-8").read()
        start = raw.index("[", raw.index('"questions":'))
        questions, _ = json.JSONDecoder().raw_decode(raw[start:])
        for m, q in enumerate(questions, 1):
            p = q["prompt"]
            plain = lambda h: BeautifulSoup(h or "", "html.parser").get_text(" ", strip=True)
            out.append({
                "id": f"exam{n}_q{m}",
                "q": plain(p.get("question")),
                "answers": [plain(a) for a in p.get("answers", [])],
                "correct": q.get("correct_response", []),
            })
    return out

SERVICES = {
 "S3": r"\bS3\b|Simple Storage Service|Glacier",
 "VPC core": r"\bVPC\b|subnet|NAT gateway|NAT instance|internet gateway|route table|security group|network ACL|\bNACL",
 "VPC endpoint/PrivateLink": r"VPC endpoint|gateway endpoint|interface endpoint|PrivateLink",
 "VPC peering/Transit Gateway": r"VPC peering|peering connection|Transit Gateway",
 "VPN/Direct Connect": r"Site-to-Site VPN|\bVPN\b|Direct Connect|Client VPN",
 "Route 53": r"Route ?53",
 "CloudFront": r"CloudFront",
 "Global Accelerator": r"Global Accelerator",
 "IAM": r"\bIAM\b|Identity and Access Management|AssumeRole|\bSTS\b|Security Token Service|permissions? boundar",
 "Organizations/SCP/Control Tower": r"Organizations|\bSCPs?\b|service control polic|Control Tower",
 "KMS": r"\bKMS\b|Key Management Service|CloudHSM",
 "ACM": r"\bACM\b|Certificate Manager",
 "Secrets Manager/Parameter Store": r"Secrets Manager|Parameter Store",
 "WAF/Shield/Firewall": r"\bWAF\b|Shield|Firewall Manager|Network Firewall",
 "GuardDuty/Inspector/Macie/SecurityHub/Detective": r"GuardDuty|Inspector|Macie|Security Hub|Detective|Security Lake",
 "Cognito": r"Cognito",
 "IAM Identity Center/Directory": r"Identity Center|\bSSO\b|single sign-on|Directory Service|Active Directory|\bSAML",
 "EC2": r"\bEC2\b|Elastic Compute Cloud|\bAMI\b|Spot Instance|Reserved Instance|Savings Plan|placement group|Dedicated Host|Elastic IP",
 "ELB": r"Load Balanc|\bALB\b|\bNLB\b|\bELB\b",
 "Auto Scaling": r"Auto Scaling",
 "ECS/EKS/Fargate/ECR": r"\bECS\b|\bEKS\b|Fargate|\bECR\b|Elastic Container|Kubernetes",
 "Lambda": r"Lambda",
 "API Gateway": r"API Gateway",
 "EBS": r"\bEBS\b|Elastic Block Store|instance store",
 "EFS": r"\bEFS\b|Elastic File System",
 "FSx": r"FSx",
 "Storage Gateway": r"Storage Gateway|File Gateway|Volume Gateway|Tape Gateway",
 "Snow Family": r"Snowball|Snowcone|Snowmobile|Snow Family",
 "DataSync/Transfer Family": r"DataSync|Transfer Family|SFTP",
 "DMS/Migration": r"\bDMS\b|Database Migration Service|Schema Conversion|Application Migration Service|\bMGN\b|Migration Hub",
 "RDS": r"\bRDS\b|Relational Database Service",
 "Aurora": r"Aurora",
 "DynamoDB": r"DynamoDB|\bDAX\b",
 "ElastiCache": r"ElastiCache|Redis|Memcached",
 "Redshift": r"Redshift",
 "Athena": r"Athena",
 "Glue/EMR/Lake Formation": r"\bGlue\b|\bEMR\b|Lake Formation",
 "OpenSearch/QuickSight": r"OpenSearch|Elasticsearch|QuickSight",
 "Other databases": r"DocumentDB|Neptune|Keyspaces|Timestream|QLDB|MemoryDB",
 "SQS": r"\bSQS\b|Simple Queue Service",
 "SNS": r"\bSNS\b|Simple Notification Service",
 "EventBridge": r"EventBridge|CloudWatch Events",
 "Step Functions": r"Step Functions",
 "Amazon MQ/AppSync": r"Amazon MQ|AppSync",
 "Kinesis/MSK": r"Kinesis|Firehose|\bMSK\b|Kafka",
 "CloudWatch": r"CloudWatch",
 "CloudTrail": r"CloudTrail",
 "AWS Config": r"AWS Config|\bConfig rules?",
 "Systems Manager": r"Systems Manager|Session Manager|\bSSM\b|Patch Manager",
 "CloudFormation/Beanstalk": r"CloudFormation|Beanstalk|\bCDK\b|Service Catalog",
 "AWS Backup/DRS": r"AWS Backup|Elastic Disaster Recovery",
 "Cost tools/Trusted Advisor": r"Cost Explorer|AWS Budgets|Trusted Advisor|Compute Optimizer|Cost and Usage",
 "AI/ML services": r"SageMaker|Rekognition|Comprehend|Transcribe|Textract|Polly|\bLex\b|Translate|Kendra|Bedrock",
 "Batch/Lightsail/Outposts/other": r"AWS Batch|Lightsail|Outposts|WorkSpaces|Amplify|Wavelength|Local Zone",
}
SERVICES["IAM"] += r"|root user|\bMFA\b|Multi.Factor"
SERVICES["EC2"] += r"|Spot (Instance|Fleet|request|pricing)|spot instances?"
SERVICES["DR strategies"] = r"Warm Standby|Pilot Light|Backup and Restore|Multi-Site|\bRTO\b|\bRPO\b|disaster recovery"

GROUPS = {
 "vpc": ("VPC + VPN + Direct Connect + Transit Gateway", ["VPC core", "VPC endpoint/PrivateLink", "VPC peering/Transit Gateway", "VPN/Direct Connect"]),
 "route53": ("Route 53", ["Route 53"]),
 "cloudfront": ("CloudFront + Global Accelerator", ["CloudFront", "Global Accelerator"]),
 "iam": ("IAM + Organizations", ["IAM", "Organizations/SCP/Control Tower"]),
 "kms": ("KMS + ACM + Secrets Manager", ["KMS", "ACM", "Secrets Manager/Parameter Store"]),
 "security": ("WAF + Shield + GuardDuty + Macie", ["WAF/Shield/Firewall", "GuardDuty/Inspector/Macie/SecurityHub/Detective"]),
 "cognito": ("Cognito + IAM Identity Center + Directory Service", ["Cognito", "IAM Identity Center/Directory"]),
 "ec2": ("EC2", ["EC2"]),
 "elb": ("ELB", ["ELB"]),
 "asg": ("Auto Scaling (ASG)", ["Auto Scaling"]),
 "containers": ("ECS + EKS + Fargate", ["ECS/EKS/Fargate/ECR"]),
 "lambda": ("Lambda + API Gateway", ["Lambda", "API Gateway"]),
 "storage": ("EBS + EFS + FSx", ["EBS", "EFS", "FSx"]),
 "storage-migration": ("Storage Gateway + Snow Family + DataSync + DMS", ["Storage Gateway", "Snow Family", "DataSync/Transfer Family", "DMS/Migration"]),
 "rds": ("RDS + Aurora", ["RDS", "Aurora"]),
 "analytics": ("ElastiCache + Redshift + Athena + Glue/EMR", ["ElastiCache", "Redshift", "Athena", "Glue/EMR/Lake Formation", "OpenSearch/QuickSight", "Other databases"]),
 "messaging": ("SQS + SNS + EventBridge + Step Functions", ["SQS", "SNS", "EventBridge", "Step Functions", "Amazon MQ/AppSync"]),
 "kinesis": ("Kinesis + MSK", ["Kinesis/MSK"]),
 "monitoring": ("CloudWatch + CloudTrail + Config + Systems Manager", ["CloudWatch", "CloudTrail", "AWS Config", "Systems Manager"]),
 "iac": ("CloudFormation + Elastic Beanstalk", ["CloudFormation/Beanstalk"]),
 "backup-dr": ("AWS Backup + Disaster Recovery strategies", ["AWS Backup/DRS", "DR strategies"]),
 "others": ("Cost tools + AI/ML + dịch vụ khác", ["Cost tools/Trusted Advisor", "AI/ML services", "Batch/Lightsail/Outposts/other"]),
}


def text(q):
    correct = " ".join(q["answers"][ord(c) - 97] for c in q["correct"] if len(c) == 1)
    return q["q"] + " " + correct


def main():
    write = "--write" in sys.argv
    questions = load_questions()
    key = lambda i: tuple(int(x) for x in re.findall(r"\d+", i))
    for gid, (title, services) in GROUPS.items():
        ids = sorted({q["id"] for q in questions
                      if any(re.search(SERVICES[s], text(q), re.I) for s in services)}, key=key)
        print(f"{len(ids):4d}  {gid:18s} {title}")
        if write and gid not in MANUAL:
            os.makedirs(gid, exist_ok=True)
            with open(os.path.join(gid, "list_qa.md"), "w") as f:
                f.write(f"# {gid.upper()} — Danh sách câu hỏi từ 6 đề thi\n\n" + "\n".join(ids)
                        + f"\n\nTổng: {len(ids)} câu\n")


if __name__ == "__main__":
    main()
