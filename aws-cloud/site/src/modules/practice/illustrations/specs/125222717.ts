// Practice test 1, question 9: a Lambda function mounts a partner account's EFS through peering and an access point.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222717,
  cols: 4.6,
  rows: 1.6,
  nodes: [
    { id: "lam", label: "Lambda function", sub: { vi: "trong VPC", en: "in a VPC" }, at: [0, 0.35] },
    { id: "peer", label: "VPC peering", sub: { vi: "hoặc shared VPC", en: "or shared VPC" }, at: [1.2, 0.35] },
    { id: "apigw", label: "API Gateway", at: [1.2, 0.35] },
    { id: "s3ap", label: "S3 access point", sub: { vi: "bản sao dữ liệu", en: "copied data" }, kind: "data", at: [1.2, 0.35] },
    { id: "layer", label: "Lambda layer", sub: { vi: "dữ liệu gen?", en: "genomic data?" }, kind: "ghost", at: [1.2, 0.35] },
    { id: "mt", label: "Mount target", sub: "EFS access point", at: [2.45, 0.35] },
    { id: "plam", label: { vi: "Lambda trung gian", en: "Proxy Lambda" }, sub: { vi: "mount EFS", en: "mounts EFS" }, at: [2.45, 0.35] },
    { id: "ds", label: "AWS DataSync", sub: { vi: "chép định kỳ", en: "scheduled copy" }, at: [2.45, 0.35] },
    { id: "efs", label: "Amazon EFS", sub: "resource policy", kind: "data", at: [3.6, 0.35] },
  ],
  zones: [
    { id: "central", label: { vi: "Tài khoản trung tâm", en: "Central account" }, tone: "account", from: [0, 0.35], to: [0, 0.35], pad: 22 },
    { id: "partner", label: { vi: "Tài khoản đối tác", en: "Partner account" }, tone: "account", from: [2.45, 0.35], to: [3.6, 0.35], pad: 22 },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["apigw", "s3ap", "layer", "plam", "ds"],
      steps: [
        {
          flow: ["lam", "peer", "mt"],
          badge: "mount",
          caption: {
            vi: "Qua VPC peering hoặc shared VPC, Lambda function mount file system bằng mount target và EFS access point như thể cùng tài khoản.",
            en: "Over VPC peering or a shared VPC, the Lambda function mounts the file system through the mount target and an EFS access point as if it were in the same account.",
          },
        },
        {
          flow: ["mt", "efs"],
          badge: { vi: "policy cho phép", en: "policy allows" },
          caption: {
            vi: "EFS resource policy cho phép truy cập chéo tài khoản từ tài khoản trung tâm. Truy cập trực tiếp, tự mở rộng, không nhân bản dữ liệu hay hàm trung gian.",
            en: "The EFS resource policy allows cross-account access from the central account. Direct access that scales, with no data duplication and no proxy functions.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Mount trực tiếp, chi phí thấp nhất.", en: "Direct mount, lowest cost." } },
    },
    {
      option: "b",
      hide: ["peer", "apigw", "layer", "mt", "plam"],
      steps: [
        { flow: ["efs", "ds", "s3ap", "lam"], tone: "warn", caption: { vi: "DataSync chép định kỳ nội dung EFS sang S3, Lambda đọc qua S3 Access Point bằng S3 API.", en: "DataSync periodically copies EFS contents to S3, and Lambda reads them through an S3 Access Point with S3 API calls." } },
        {
          mark: "s3ap",
          tone: "bad",
          badge: { vi: "bản sao · trễ", en: "copies · delay" },
          caption: {
            vi: "Dữ liệu bị lưu trùng, tốn phí truyền định kỳ, thêm độ trễ và độ phức tạp, và không còn thao tác file system độ trễ thấp.",
            en: "Storage is duplicated with recurring transfer costs, delay and complexity, and low-latency file system operations are lost.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Nhân bản dữ liệu và chậm.", en: "Duplicated data, delayed." } },
    },
    {
      option: "c",
      hide: ["peer", "s3ap", "layer", "mt", "ds"],
      steps: [
        { flow: ["lam", "apigw", "plam", "efs"], tone: "warn", caption: { vi: "Lambda chính gọi Lambda thứ hai ở tài khoản đối tác qua API Gateway để đọc dữ liệu.", en: "The main Lambda invokes a second Lambda in the partner account through API Gateway to read the data." } },
        {
          mark: "plam",
          tone: "bad",
          badge: { vi: "thêm tầng", en: "extra layer" },
          caption: {
            vi: "Hàm trung gian thêm độ trễ và độ phức tạp, phá vỡ mô hình truy cập file trực tiếp, và mỗi lần mở rộng lại tốn thêm chi phí compute.",
            en: "The proxy function adds latency and complexity, breaks direct file access, and every bit of scaling adds compute cost.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Trung gian tốn kém, chậm.", en: "A costly, slow proxy." } },
    },
    {
      option: "d",
      hide: ["peer", "apigw", "s3ap", "mt", "plam", "ds"],
      steps: [
        {
          stop: ["layer", "lam"],
          caption: {
            vi: "Lambda layer dành cho code và dependency dùng chung, giới hạn 250 MB khi giải nén và không thay đổi được sau khi publish; không chứa nổi bộ dữ liệu gen lớn và ngày càng tăng.",
            en: "Lambda layers are for shared code and dependencies, limited to 250 MB unzipped and immutable once published; they cannot hold large, growing genomic datasets.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Layer không dùng để chứa dữ liệu.", en: "Layers are not for data." } },
    },
  ],
};

export default spec;
