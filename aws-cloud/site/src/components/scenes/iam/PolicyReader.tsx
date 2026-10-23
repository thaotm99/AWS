import { useState } from "react";
import { useLang } from "../../../lib/lang";

type Lang = ReturnType<typeof useLang>;

// Reading IAM policy JSON the way the tests ask: conditions on source IP and Region,
// and bucket vs object ARNs for S3 (exam2_q37, exam2_q38, exam2_q48, exam2_q54, exam1_q58).
interface Req { label: string; allowed: boolean; why: string }
interface Pol { name: string; json: string; requests: Req[] }

const policies = (L: Lang): Pol[] => [
  {
    name: L({ vi: "Điều kiện IP nguồn", en: "Source IP condition" }),
    json: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["ec2:RunInstances", "ec2:TerminateInstances"],
    "Resource": "*",
    "Condition": {
      "IpAddress": { "aws:SourceIp": "10.200.200.0/24" }
    }
  }]
}`,
    requests: [
      { label: L({ vi: "Terminate instance, gọi từ 10.200.200.200", en: "Terminate instance, called from 10.200.200.200" }), allowed: true, why: L({ vi: "Action có trong policy và IP 10.200.200.200 thuộc dải 10.200.200.0/24.", en: "The action is in the policy, and IP 10.200.200.200 is in the range 10.200.200.0/24." }) },
      { label: L({ vi: "Terminate instance, gọi từ 10.200.201.5", en: "Terminate instance, called from 10.200.201.5" }), allowed: false, why: L({ vi: "IP nằm ngoài dải /24 nên điều kiện không khớp. Không có statement Allow nào khớp nên request bị từ chối ngầm định (implicit deny).", en: "The IP is outside the /24 range, so the condition does not match. No Allow statement matches, so the request is implicitly denied (implicit deny)." }) },
      { label: L({ vi: "Stop instance, gọi từ 10.200.200.200", en: "Stop instance, called from 10.200.200.200" }), allowed: false, why: L({ vi: "ec2:StopInstances không có trong danh sách Action, dù IP hợp lệ.", en: "ec2:StopInstances is not in the Action list, even though the IP is valid." }) },
    ],
  },
  {
    name: L({ vi: "Điều kiện Region", en: "Region condition" }),
    json: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "ec2:RunInstances",
    "Resource": "*",
    "Condition": {
      "StringEquals": { "aws:RequestedRegion": "eu-west-1" }
    }
  }]
}`,
    requests: [
      { label: L({ vi: "Khởi chạy EC2 instance tại eu-west-1, bên gọi đang ở Việt Nam", en: "Launch an EC2 instance in eu-west-1, caller is in Vietnam" }), allowed: true, why: L({ vi: "aws:RequestedRegion là Region nhận API call, không phải vị trí của bên gọi. API call được phép từ bất kỳ vị trí nào.", en: "aws:RequestedRegion is the Region that receives the API call, not the caller's location. The API call is allowed from any location." }) },
      { label: L({ vi: "Khởi chạy EC2 instance tại ap-southeast-1", en: "Launch an EC2 instance in ap-southeast-1" }), allowed: false, why: L({ vi: "Region của request không phải eu-west-1 nên điều kiện không khớp.", en: "The request's Region is not eu-west-1, so the condition does not match." }) },
    ],
  },
  {
    name: L({ vi: "S3 chỉ đọc", en: "S3 read-only" }),
    json: `{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::mftech-images" },
    { "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mftech-images/*" }
  ]
}`,
    requests: [
      { label: L({ vi: "Liệt kê object trong bucket", en: "List objects in the bucket" }), allowed: true, why: L({ vi: "s3:ListBucket là thao tác trên bucket, nên Resource là ARN của bucket (không có /*).", en: "s3:ListBucket is a bucket operation, so the Resource is the bucket ARN (without /*)." }) },
      { label: L({ vi: "Tải xuống một ảnh", en: "Download an image" }), allowed: true, why: L({ vi: "s3:GetObject là thao tác trên object, nên Resource là bucket/*.", en: "s3:GetObject is an object operation, so the Resource is bucket/*." }) },
      { label: L({ vi: "Xóa một ảnh", en: "Delete an image" }), allowed: false, why: L({ vi: "Policy không chứa s3:DeleteObject. Đây là policy chỉ cấp quyền đọc.", en: "The policy does not contain s3:DeleteObject. This policy grants read access only." }) },
    ],
  },
  {
    name: L({ vi: "Lỗi ARN thường gặp", en: "Common ARN mistake" }),
    json: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:DeleteObject",
    "Resource": "arn:aws:s3:::mftech-images"
  }]
}`,
    requests: [
      { label: L({ vi: "Xóa một ảnh", en: "Delete an image" }), allowed: false, why: L({ vi: "DeleteObject là thao tác trên object nhưng Resource lại là ARN của bucket. Resource phải được sửa thành arn:aws:s3:::mftech-images/* để thao tác xóa được phép.", en: "DeleteObject is an object operation, but the Resource is the bucket ARN. The Resource must be changed to arn:aws:s3:::mftech-images/* for the delete to be allowed." }) },
    ],
  },
];

export default function PolicyReader() {
  const L = useLang();
  const POLICIES = policies(L);
  const [pi, setPi] = useState(0);
  const [ri, setRi] = useState<number | null>(null);
  const p = POLICIES[pi];
  const r = ri === null ? null : p.requests[ri];

  return (
    <div className="stage">
      <div className="stage-bar" role="group" aria-label={L({ vi: "Chọn policy", en: "Choose a policy" })}>
        <span className="label">Policy</span>
        {POLICIES.map((x, i) => (
          <button key={x.name} className="btn" aria-pressed={i === pi} onClick={() => { setPi(i); setRi(null); }}>{x.name}</button>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] max-md:grid-cols-1">
        <pre className="m-0 overflow-x-auto border-r border-line bg-bg px-4 py-3.5 text-[0.8125rem] leading-[1.5] max-md:border-r-0 max-md:border-b"><code>{p.json}</code></pre>
        <div className="grid content-start gap-1.5 p-3.5">
          <div className="label text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">{L({ vi: "Request kiểm tra", en: "Test requests" })}</div>
          {p.requests.map((x, i) => (
            <button key={x.label} className="picker-item" aria-pressed={i === ri} onClick={() => setRi(i)}>{x.label}</button>
          ))}
        </div>
      </div>
      <div className="readout" aria-live="polite">
        {r ? (
          <>
            <span className={"pill " + (r.allowed ? "ok" : "bad")}><i />{r.allowed ? "Allow" : "Deny"}</span>
            <p style={{ margin: "8px 0 0" }}>{r.why}</p>
          </>
        ) : <p style={{ margin: 0 }}>{L({ vi: "Đọc policy bên trái, dự đoán kết quả, sau đó chọn một request để kiểm tra.", en: "Read the policy on the left, predict the result, then choose a request to test." })}</p>}
      </div>
    </div>
  );
}
