// Practice test 1, question 64: multipart upload through S3 Transfer Acceleration for a daily 2 GB file.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222695,
  cols: 3.8,
  rows: 2.4,
  nodes: [
    { id: "dc", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, sub: { vi: "file nén ~2 GB", en: "~2 GB compressed file" }, kind: "onprem", at: [0, 0.7] },
    { id: "edge", label: "Edge location", sub: "S3 Transfer Acceleration", at: [1.4, 0] },
    { id: "ec2", label: "EC2 (FTP)", sub: { vi: "cùng Region", en: "same Region" }, at: [1.4, 1.4] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [2.8, 0.7] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["ec2"],
      steps: [
        {
          flow: ["dc", "edge"],
          times: 4,
          badge: { vi: "các phần song song", en: "parallel parts" },
          caption: {
            vi: "Multipart upload chia file thành nhiều phần tải song song để tận dụng băng thông, và chỉ gửi lại phần bị lỗi.",
            en: "Multipart upload splits the file into parts uploaded in parallel to use the available bandwidth, resending only failed parts.",
          },
        },
        {
          flow: ["edge", "s3"],
          times: 4,
          badge: { vi: "đường tối ưu", en: "optimised path" },
          caption: {
            vi: "Transfer Acceleration nhận dữ liệu tại edge location của CloudFront rồi định tuyến tới S3 qua đường mạng tối ưu.",
            en: "Transfer Acceleration takes the data in at a CloudFront edge location and routes it to S3 over an optimised network path.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Song song và qua đường tối ưu.", en: "Parallel, over an optimised path." } },
    },
    {
      option: "b",
      hide: ["ec2", "edge"],
      steps: [
        { flow: ["dc", "s3"], times: 4, badge: { vi: "các phần", en: "parts" }, caption: { vi: "Multipart upload đã giúp tải nhanh hơn nhờ tải song song.", en: "Multipart upload already speeds things up with parallel parts." } },
        { mark: "s3", tone: "warn", badge: { vi: "chưa nhanh nhất", en: "not the fastest" }, caption: { vi: "Kết hợp thêm S3 Transfer Acceleration còn tăng tốc độ hơn nữa, nên đây chưa phải cách nhanh nhất.", en: "Adding S3 Transfer Acceleration improves speed further, so this is not the fastest way." } },
      ],
      verdict: { works: false, caption: { vi: "Thiếu Transfer Acceleration.", en: "Missing Transfer Acceleration." } },
    },
    {
      option: "a",
      hide: ["ec2", "edge"],
      steps: [
        { flow: ["dc", "s3"], tone: "warn", badge: { vi: "một lần PUT", en: "single PUT" }, caption: { vi: "Tải file trong một thao tác duy nhất.", en: "The file goes up in a single operation." } },
        { mark: "s3", tone: "bad", caption: { vi: "Từ khoảng 100 MB nên cân nhắc multipart upload; tải một lần không có lợi ích song song.", en: "From about 100 MB, multipart upload should be considered; a single operation gets no parallelism." } },
      ],
      verdict: { works: false, caption: { vi: "Chậm nhất.", en: "The slowest." } },
    },
    {
      option: "c",
      hide: ["edge"],
      steps: [
        { flow: ["dc", "ec2", "s3"], tone: "warn", badge: "FTP", caption: { vi: "FTP file lên EC2 trong cùng Region rồi chuyển từ EC2 vào S3.", en: "FTP the file to EC2 in the same Region, then transfer it from EC2 to S3." } },
        { mark: "ec2", tone: "bad", badge: { vi: "đi vòng", en: "roundabout" }, caption: { vi: "Khả thi về kỹ thuật nhưng vòng vèo, cần nhiều script và chắc chắn không phải cách nhanh nhất.", en: "Technically feasible but roundabout, script-heavy and certainly not the fastest." } },
      ],
      verdict: { works: false, caption: { vi: "Vòng vèo.", en: "Roundabout." } },
    },
  ],
};

export default spec;
