import { useLang } from "../../../lib/lang";
import CaseSim, { type CaseScenario } from "./CaseSim";

// Four things that are easy to get wrong when MFTECH spreads across Regions and
// AZs: EFS across Regions, where a NAT gateway lives, AZ names vs AZ IDs, and
// using CloudFront (edge cache for repeated views) together with S3 Transfer Acceleration (transfers to and from the bucket).

type Lang = ReturnType<typeof useLang>;

function scenarios(L: Lang): CaseScenario[] {
  return [
    {
      name: L({ vi: "EC2 instance tại Singapore mount EFS tại us-east-1", en: "An EC2 instance in Singapore mounts EFS in us-east-1" }),
      request: "mount fs-0a1b.efs.us-east-1",
      from: L({ vi: "từ EC2 instance báo cáo tại Singapore", en: "from the reporting EC2 instance in Singapore" }),
      boxes: [
        { x: 20, y: 16, w: 300, h: 206, label: L({ vi: "Region Singapore", en: "Singapore Region" }) },
        { x: 500, y: 16, w: 300, h: 206, label: L({ vi: "Region N. Virginia (us-east-1)", en: "N. Virginia Region (us-east-1)" }) },
      ],
      nodes: [
        { id: "ec2", x: 90, y: 50, w: 160, l1: L({ vi: "EC2 báo cáo", en: "Reporting EC2" }), l2: "VPC Singapore" },
        { id: "copy", x: 90, y: 150, w: 160, l1: L({ vi: "EFS mới", en: "New EFS" }), l2: L({ vi: "bản sao dữ liệu", en: "data copy" }) },
        { id: "efs", x: 570, y: 96, w: 160, l1: "EFS", l2: L({ vi: "dữ liệu gốc", en: "original data" }) },
      ],
      links: [
        { id: "peer", a: "ec2", b: "efs", label: "inter-region VPC peering", lx: 410, ly: 76 },
        { a: "ec2", b: "copy" },
        { a: "copy", b: "efs", dashed: true, label: L({ vi: "copy lại khi thay đổi", en: "copy again on change" }), lx: 410, ly: 185 },
      ],
      start: "ec2",
      choices: { label: L({ vi: "Phương án", en: "Option" }), options: [L({ vi: "Copy dữ liệu sang EFS tại Singapore", en: "Copy data to EFS in Singapore" }), L({ vi: "Mount qua VPC peering", en: "Mount over VPC peering" })], initial: 0 },
      run: (v) => v === 0
        ? { hide: ["peer"], back: false,
            steps: [
              { at: "copy", state: "pass", msg: L({ vi: "Đọc được bản sao tại Singapore.", en: "The copy in Singapore can be read." }) },
              { at: "efs", state: "change", tag: L({ vi: "SAI LỆCH", en: "OUT OF SYNC" }), msg: L({ vi: "Mỗi khi dữ liệu gốc thay đổi, dữ liệu phải được copy lại; hai bản dễ mất đồng bộ.", en: "Every time the original data changes, it must be copied again; the two copies easily get out of sync." }) },
            ],
            ok: false, result: L({ vi: "Hoạt động được nhưng phát sinh tác vụ không cần thiết. EFS là tài nguyên cấp Region nhưng không bị giới hạn truy cập trong Region đó.", en: "It works but adds unnecessary work. EFS is a Regional resource, but access to it is not limited to that Region." }) }
        : { hide: ["copy"],
            steps: [{ at: "efs", state: "pass", msg: L({ vi: "Mount trực tiếp EFS tại us-east-1 qua **inter-region VPC peering**.", en: "Mount the EFS in us-east-1 directly over **inter-Region VPC peering**." }) }],
            ok: true, result: L({ vi: "Chỉ duy trì một bản dữ liệu; EC2 instance tại Region khác vẫn sử dụng chung được.", en: "Only one copy of the data is maintained; EC2 instances in another Region can still share it." }) },
    },
    {
      name: L({ vi: "Worker instance trong private subnet tải bản vá", en: "A worker instance in a private subnet downloads patches" }),
      request: "GET https://updates.example.com (IPv4)",
      from: L({ vi: "từ worker EC2 instance", en: "from the worker EC2 instance" }),
      boxes: [
        { x: 20, y: 6, w: 560, h: 228, label: "VPC MFTECH · AZ a" },
        { x: 40, y: 28, w: 520, h: 84, label: "public subnet · route 0.0.0.0/0 → IGW" },
        { x: 40, y: 126, w: 520, h: 96, label: "private subnet" },
      ],
      nodes: [
        { id: "worker", x: 60, y: 158, w: 130, l1: "Worker EC2", l2: L({ vi: "chỉ có private IP", en: "private IP only" }) },
        { id: "natPriv", x: 270, y: 158, w: 140, l1: "NAT gateway", l2: L({ vi: "đặt trong private subnet", en: "in the private subnet" }) },
        { id: "eigw", x: 270, y: 158, w: 140, l1: "Egress-only IGW", l2: L({ vi: "chỉ dành cho IPv6", en: "IPv6 only" }) },
        { id: "natPub", x: 270, y: 50, w: 140, l1: "NAT gateway", l2: L({ vi: "đặt trong public subnet", en: "in the public subnet" }) },
        { id: "igw", x: 620, y: 50, w: 140, l1: "Internet Gateway" },
        { id: "net", x: 620, y: 158, w: 140, l1: "Internet", l2: L({ vi: "server bản vá", en: "patch server" }) },
      ],
      links: [
        { a: "worker", b: "natPriv" },
        { a: "worker", b: "eigw" },
        { a: "worker", b: "natPub", via: [[125, 73]] },
        { a: "natPub", b: "igw" },
        { a: "igw", b: "net" },
        { a: "eigw", b: "net" },
      ],
      start: "worker",
      choices: { label: L({ vi: "Đường ra internet (egress)", en: "Internet egress" }), options: [L({ vi: "NAT gateway trong private subnet", en: "NAT gateway in private subnet" }), L({ vi: "NAT gateway trong public subnet", en: "NAT gateway in public subnet" }), "Egress-only IGW"], initial: 0 },
      run: (v) => {
        if (v === 0) return { hide: ["natPub", "eigw"],
          steps: [
            { at: "natPriv", state: "pass", msg: L({ vi: "Route `0.0.0.0/0` của private subnet trỏ tới NAT gateway.", en: "The private subnet's `0.0.0.0/0` route points to the NAT gateway." }) },
            { at: "natPriv", state: "block", msg: L({ vi: "NAT gateway nằm trong private subnet, và subnet này không có route tới internet gateway.", en: "The NAT gateway is in a private subnet, and this subnet has no route to the internet gateway." }) },
          ],
          ok: false, result: L({ vi: "Không truy cập được internet. Public NAT gateway ở chế độ zonal phải nằm trong **public subnet**.", en: "No internet access. A public NAT gateway in zonal mode must be in a **public subnet**." }) };
        if (v === 1) return { hide: ["natPriv", "eigw"],
          steps: [
            { at: "natPub", via: [[125, 73]], state: "change", tag: "NAT", msg: L({ vi: "NAT gateway thay thế private IP của worker bằng Elastic IP của NAT gateway.", en: "The NAT gateway replaces the worker's private IP with the NAT gateway's Elastic IP." }) },
            { at: "igw", state: "pass", msg: L({ vi: "Public subnet có route tới internet gateway.", en: "The public subnet has a route to the internet gateway." }) },
            { at: "net", state: "pass", msg: L({ vi: "Bản vá được tải về. Internet không thể khởi tạo kết nối ngược vào worker.", en: "The patches are downloaded. The internet cannot initiate connections back to the worker." }) },
          ],
          ok: true, result: L({ vi: "Truy cập internet thành công. Zonal NAT gateway thuộc một AZ, do đó mỗi AZ cần một NAT gateway để chịu được sự cố AZ; chế độ regional NAT gateway tự động mở rộng sang các AZ có workload.", en: "Internet access works. A zonal NAT gateway belongs to one AZ, so each AZ needs a NAT gateway to tolerate an AZ failure; a regional NAT gateway automatically expands to the AZs that have workloads." }) };
        return { hide: ["natPriv", "natPub"],
          steps: [{ at: "eigw", state: "block", flash: "IPv4?", msg: L({ vi: "Egress-only internet gateway chỉ cho phép traffic **IPv6** đi ra.", en: "An egress-only internet gateway allows only outbound **IPv6** traffic." }) }],
          ok: false, result: L({ vi: "Không truy cập được internet bằng IPv4. Kết nối internet một chiều với IPv4 sử dụng NAT gateway.", en: "No internet access over IPv4. One-way internet access for IPv4 uses a NAT gateway." }) };
      },
    },
    {
      name: L({ vi: "Đặt EC2 instance cùng AZ với instance của đối tác", en: "Place an EC2 instance in the same AZ as a partner's instance" }),
      request: "ping 10.20.0.15",
      from: L({ vi: "từ account MFTECH tới account đối tác", en: "from the MFTECH account to the partner account" }),
      boxes: [
        { x: 20, y: 16, w: 370, h: 206, label: L({ vi: "AZ vật lý use1-az2", en: "Physical AZ use1-az2" }) },
        { x: 430, y: 16, w: 370, h: 206, label: L({ vi: "AZ vật lý use1-az4", en: "Physical AZ use1-az4" }) },
      ],
      nodes: [
        { id: "shop", x: 40, y: 96, w: 160, l1: L({ vi: "Server MFTECH", en: "MFTECH server" }), l2: "account A: us-east-1a" },
        { id: "near", x: 215, y: 96, w: 160, l1: L({ vi: "Instance đối tác", en: "Partner instance" }), l2: "account B: use1-az2" },
        { id: "far", x: 560, y: 96, w: 180, l1: L({ vi: "Instance đối tác", en: "Partner instance" }), l2: "account B: us-east-1a" },
      ],
      links: [{ a: "shop", b: "near" }, { a: "shop", b: "far" }],
      start: "shop",
      choices: { label: L({ vi: "Định danh AZ", en: "AZ identifier" }), options: [L({ vi: "Tên AZ (us-east-1a)", en: "AZ name (us-east-1a)" }), "AZ ID (use1-az2)"], initial: 0 },
      run: (v) => v === 0
        ? { hide: ["near"],
            steps: [{ at: "far", state: "change", tag: L({ vi: "KHÁC AZ", en: "OTHER AZ" }), msg: L({ vi: "Cùng tên `us-east-1a`, nhưng tại account B tên này ánh xạ tới **use1-az4**.", en: "Same name `us-east-1a`, but in account B this name maps to **use1-az4**." }) }],
            ok: false, result: L({ vi: "Hai instance nằm tại hai AZ khác nhau: phát sinh thêm độ trễ và phí data transfer giữa các AZ.", en: "The two instances are in two different AZs: this adds latency and cross-AZ data transfer charges." }) }
        : { hide: ["far"],
            steps: [{ at: "near", state: "pass", msg: L({ vi: "Cả hai account chọn subnet theo **AZ ID** `use1-az2`.", en: "Both accounts choose subnets by **AZ ID** `use1-az2`." }) }],
            ok: true, result: L({ vi: "Hai instance nằm trong cùng một AZ vật lý. Tại các Region ánh xạ AZ độc lập theo account như us-east-1, cùng một tên AZ có thể trỏ tới AZ vật lý khác nhau; AZ ID thì nhất quán giữa mọi account.", en: "The two instances are in the same physical AZ. In Regions that map AZs independently per account, such as us-east-1, the same AZ name can point to different physical AZs; the AZ ID is consistent across all accounts." }) },
    },
    {
      name: L({ vi: "Người dùng vừa truy xuất vừa tải lên ảnh", en: "Users both fetch and upload images" }),
      request: "GET /images/*  +  PUT /uploads/*",
      from: L({ vi: "từ Úc", en: "from Australia" }),
      nodes: [
        { id: "user", x: 30, y: 97, w: 60, l1: L({ vi: "Người dùng", en: "Users" }), user: true },
        { id: "cf", x: 300, y: 28, w: 170, l1: "CloudFront", l2: L({ vi: "edge gần người dùng", en: "edge near users" }) },
        { id: "s3ta", x: 300, y: 166, w: 170, l1: "S3 Transfer Acceleration", l2: L({ vi: "edge gần người dùng", en: "edge near users" }) },
        { id: "s3", x: 640, y: 97, w: 150, l1: "S3 bucket", l2: "Singapore" },
      ],
      links: [
        { a: "user", b: "cf" }, { a: "cf", b: "s3" },
        { a: "user", b: "s3ta" }, { a: "s3ta", b: "s3" },
        { id: "direct", a: "user", b: "s3", dashed: true, label: L({ vi: "internet đường dài", en: "long-distance internet" }), lx: 385, ly: 114 },
      ],
      start: "user",
      choices: { label: L({ vi: "Kích hoạt", en: "Enable" }), options: [L({ vi: "Chỉ CloudFront", en: "CloudFront only" }), L({ vi: "Chỉ S3 Transfer Acceleration", en: "S3 Transfer Acceleration only" }), L({ vi: "Cả hai", en: "Both" })], initial: 0 },
      run: (v) => {
        const view = [
          { at: "cf", state: "pass" as const, tag: "HIT", msg: L({ vi: "Ảnh có sẵn trong edge cache.", en: "The image is already in the edge cache." }) },
          { at: "user", state: "pass" as const, tag: L({ vi: "NHẬN", en: "RECEIVED" }), msg: L({ vi: "Ảnh được hiển thị ngay.", en: "The image is displayed immediately." }) },
        ];
        const fastUp = [
          { at: "s3ta", state: "change" as const, tag: L({ vi: "TĂNG TỐC", en: "ACCELERATED" }), msg: L({ vi: "Dữ liệu được tải lên edge location gần nhất, sau đó truyền qua mạng AWS.", en: "Data is uploaded to the nearest edge location, then travels over the AWS network." }) },
          { at: "s3", state: "pass" as const, msg: L({ vi: "Ảnh mới được ghi vào bucket.", en: "The new image is written to the bucket." }) },
        ];
        if (v === 0) return { hide: ["s3ta"], back: false,
          steps: [...view, { at: "s3", state: "change", tag: L({ vi: "CHẬM", en: "SLOW" }), msg: L({ vi: "Dữ liệu tải lên được truyền qua internet đường dài tới Singapore.", en: "Uploaded data travels over the long-distance internet to Singapore." }) }],
          ok: false, result: L({ vi: "Truy xuất nhanh nhưng tải lên vẫn chậm. Cần bổ sung S3 Transfer Acceleration.", en: "Fetching is fast but uploads are still slow. S3 Transfer Acceleration must be added." }) };
        if (v === 1) return { hide: ["cf"], back: false,
          steps: [
            { at: "s3", state: "change", tag: L({ vi: "CHẬM", en: "SLOW" }), msg: L({ vi: "Không có cache: mỗi lượt xem đều lấy ảnh từ bucket ở Singapore. Transfer Acceleration rút ngắn đường truyền nhưng không lưu ảnh tại edge.", en: "No cache: every view fetches the image from the bucket in Singapore. Transfer Acceleration shortens the network path but does not store the image at the edge." }) },
            { at: "user", state: "pass", tag: L({ vi: "NHẬN", en: "RECEIVED" }), msg: L({ vi: "Ảnh được xem lặp lại vẫn phải đi về bucket mỗi lần, chậm hơn lấy từ edge cache.", en: "A repeatedly viewed image still travels from the bucket every time, slower than serving it from the edge cache." }) },
            ...fastUp,
          ],
          ok: false, result: L({ vi: "Tải lên nhanh, nhưng ảnh được xem lặp lại không được cache. Bổ sung CloudFront để cache ảnh tại edge location.", en: "Uploads are fast, but repeatedly viewed images are not cached. Add CloudFront to cache the images at edge locations." }) };
        return { hide: ["direct"], back: false, steps: [...view, ...fastUp],
          ok: true, result: L({ vi: "CloudFront cache ảnh được xem lặp lại tại edge location; S3 Transfer Acceleration tăng tốc truyền dữ liệu tới và từ bucket, ở tình huống này là chiều tải lên.", en: "CloudFront caches the repeatedly viewed images at edge locations; S3 Transfer Acceleration speeds up transfers to and from the bucket, here the uploads." }) };
      },
    },
  ];
}

export default function GlobalMythsSim() {
  const L = useLang();
  return <CaseSim scenarios={scenarios(L)} label={L({ vi: "Bốn lỗi cấu hình thường gặp khi triển khai MFTECH trên nhiều Region", en: "Four common configuration mistakes when deploying MFTECH across Regions" })} action={L({ vi: "Chạy mô phỏng", en: "Run simulation" })} />;
}
