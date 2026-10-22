import { useState } from "react";

// Reading IAM policy JSON the way the tests ask: conditions on source IP and Region,
// and bucket vs object ARNs for S3 (exam2_q37, exam2_q38, exam2_q48, exam2_q54, exam1_q58).
interface Req { label: string; allowed: boolean; why: string }
interface Pol { name: string; json: string; requests: Req[] }

const POLICIES: Pol[] = [
  {
    name: "Điều kiện IP nguồn",
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
      { label: "Terminate instance, gọi từ 10.200.200.200", allowed: true, why: "Action có trong policy và IP 10.200.200.200 thuộc dải 10.200.200.0/24." },
      { label: "Terminate instance, gọi từ 10.200.201.5", allowed: false, why: "IP nằm ngoài dải /24 nên điều kiện không khớp. Không có statement Allow nào khớp nên request bị từ chối ngầm định (implicit deny)." },
      { label: "Stop instance, gọi từ 10.200.200.200", allowed: false, why: "ec2:StopInstances không có trong danh sách Action, dù IP hợp lệ." },
    ],
  },
  {
    name: "Điều kiện Region",
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
      { label: "Chạy EC2 tại eu-west-1, bên gọi đang ở Việt Nam", allowed: true, why: "aws:RequestedRegion là Region nhận API call, không phải vị trí của bên gọi. API call được phép từ bất kỳ vị trí nào." },
      { label: "Chạy EC2 tại ap-southeast-1", allowed: false, why: "Region của request không phải eu-west-1 nên điều kiện không khớp." },
    ],
  },
  {
    name: "S3 chỉ đọc",
    json: `{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::shopviet-images" },
    { "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::shopviet-images/*" }
  ]
}`,
    requests: [
      { label: "Liệt kê object trong bucket", allowed: true, why: "s3:ListBucket là thao tác trên bucket, nên Resource là ARN của bucket (không có /*)." },
      { label: "Tải xuống một ảnh", allowed: true, why: "s3:GetObject là thao tác trên object, nên Resource là bucket/*." },
      { label: "Xóa một ảnh", allowed: false, why: "Policy không chứa s3:DeleteObject. Đây là policy chỉ cấp quyền đọc." },
    ],
  },
  {
    name: "Lỗi ARN thường gặp",
    json: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:DeleteObject",
    "Resource": "arn:aws:s3:::shopviet-images"
  }]
}`,
    requests: [
      { label: "Xóa một ảnh", allowed: false, why: "DeleteObject là thao tác trên object nhưng Resource lại là ARN của bucket. Resource phải được sửa thành arn:aws:s3:::shopviet-images/* để thao tác xóa được phép." },
    ],
  },
];

export default function PolicyReader() {
  const [pi, setPi] = useState(0);
  const [ri, setRi] = useState<number | null>(null);
  const p = POLICIES[pi];
  const r = ri === null ? null : p.requests[ri];

  return (
    <div className="stage">
      <div className="stage-bar" role="group" aria-label="Chọn policy">
        <span className="label">Policy</span>
        {POLICIES.map((x, i) => (
          <button key={x.name} className="btn" aria-pressed={i === pi} onClick={() => { setPi(i); setRi(null); }}>{x.name}</button>
        ))}
      </div>
      <div className="policy-grid">
        <pre className="policy-json"><code>{p.json}</code></pre>
        <div className="policy-reqs">
          <div className="label">Request kiểm tra</div>
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
        ) : <p style={{ margin: 0 }}>Đọc policy bên trái, dự đoán kết quả, sau đó chọn một request để kiểm tra.</p>}
      </div>
    </div>
  );
}
