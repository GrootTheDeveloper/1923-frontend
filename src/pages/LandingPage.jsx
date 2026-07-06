import { Link } from "react-router-dom";

const checks = [
  ["Độ khớp với JD", "So sánh kỹ năng, kinh nghiệm, cấp bậc và yêu cầu bắt buộc trong tin tuyển dụng."],
  ["Từ khóa ATS", "Nhận diện keyword quan trọng trong JD và phần CV còn thiếu bằng chứng."],
  ["Điểm phù hợp", "Tổng hợp rule score, semantic score, AI ranking và độ tin cậy thành một báo cáo dễ đọc."],
  ["Gợi ý phỏng vấn", "Tạo câu hỏi xác minh dựa trên khoảng trống kỹ năng và điểm chưa chắc chắn."],
  ["Tổng hợp ứng viên", "Khi có nhiều CV, hệ thống xếp hạng và hỗ trợ shortlist minh bạch cho HR."],
  ["Xuất báo cáo", "Tải báo cáo tuyển dụng dạng PDF để chia sẻ với team hoặc lưu hồ sơ."],
];

const steps = [
  ["01", "Dán JD", "Nhập tin tuyển dụng để AI tách kỹ năng, yêu cầu bắt buộc và tiêu chí ưu tiên."],
  ["02", "Tải CV", "Upload một hoặc nhiều CV PDF. Guest được dùng miễn phí có giới hạn và được bảo vệ bằng Turnstile."],
  ["03", "Chạy phân tích", "Hệ thống đọc CV, so khớp JD, tính điểm và trích bằng chứng liên quan."],
  ["04", "Ra quyết định", "Xem report, shortlist/reject/review, gửi feedback để lần xếp hạng sau tốt hơn."],
];

const faqs = [
  ["Có cần đăng nhập để check CV không?", "Không bắt buộc. Bạn có thể dùng vài lượt miễn phí ở chế độ guest. Đăng nhập giúp lưu lịch sử và quản lý nhiều phiên phân tích tốt hơn."],
  ["Hệ thống khác gì một CV checker thông thường?", "Hệ thống này không chỉ chấm CV chung chung. Nó so CV với một JD cụ thể, giải thích kỹ năng khớp/thiếu và hỗ trợ tổng hợp nhiều ứng viên."],
  ["Có chống spam upload không?", "Có. Guest session, IP, subnet, concurrent quota, giới hạn file và Cloudflare Turnstile đều được bật trong flow upload public."],
  ["Dữ liệu đầu vào gồm gì?", "Bạn cần một JD và ít nhất một CV. Sau đó có thể chạy matching, xem báo cáo chi tiết và xuất PDF tổng hợp."],
];

function MiniIcon({ type }) {
  const paths = {
    scan: "M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M8 12h8M8 9h5M8 15h6",
    check: "m5 12 4 4L19 6",
    file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h6",
    lock: "M7 11V8a5 5 0 0 1 10 0v3 M6 11h12v10H6z M12 15v2",
    arrow: "M5 12h14 m-6-6 6 6-6 6",
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[type].split(" M").map((path, index) => <path key={path} d={index ? `M${path}` : path} />)}
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-shell" data-ai-id="public-landing">
      <header className="landing-nav" data-ai-id="landing-nav">
        <Link className="landing-brand" to="/" aria-label="TalentScan home">
          <span><MiniIcon type="scan" /></span>
          <strong>TalentScan</strong>
        </Link>
        <nav aria-label="Landing navigation">
          <a href="#workflow">Quy trình</a>
          <a href="#checks">AI kiểm tra gì</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing-nav-actions">
          <Link to="/login" className="landing-link">Đăng nhập</Link>
          <Link to="/register" className="landing-link register-link">Đăng ký</Link>
          <Link to="/app" className="landing-cta small">Check CV</Link>
        </div>
      </header>

      <main>
        <section className="landing-hero" data-ai-id="landing-hero">
          <div className="hero-copy">
            <p className="landing-kicker">AI CV Checker theo JD thực tế</p>
            <h1>Đánh giá CV theo đúng vị trí đang tuyển.</h1>
            <p>
              Dán JD, tải một hoặc nhiều CV và nhận báo cáo mức độ phù hợp: kỹ năng khớp, kỹ năng thiếu,
              điểm tin cậy, bằng chứng trong CV và gợi ý bước tiếp theo.
            </p>
            <div className="hero-actions">
              <Link to="/app" className="landing-cta">Phân tích CV miễn phí <MiniIcon type="arrow" /></Link>
              <a href="#sample-report" className="landing-secondary">Xem mẫu báo cáo</a>
            </div>
            <div className="hero-trust" aria-label="Product limits and protections">
              <span><MiniIcon type="check" /> Miễn phí vài lượt/ngày</span>
              <span><MiniIcon type="file" /> CV PDF tối đa 5MB</span>
              <span><MiniIcon type="lock" /> Turnstile chống spam upload</span>
            </div>
          </div>

          <aside className="report-preview" id="sample-report" data-ai-id="sample-report-preview">
            <div className="preview-toolbar">
              <span></span><span></span><span></span>
              <b>JD: Backend Engineer</b>
            </div>
            <div className="preview-score">
              <div className="preview-ring"><strong>82</strong><span>/100</span></div>
              <div>
                <p>Phù hợp cao</p>
                <h2>CV có nền tảng API, database và cloud rõ ràng.</h2>
              </div>
            </div>
            <div className="preview-grid">
              <section>
                <span>Đã khớp</span>
                <b>Python, FastAPI, MongoDB, Docker</b>
              </section>
              <section>
                <span>Cần xác minh</span>
                <b>Kubernetes, system design, ownership</b>
              </section>
            </div>
            <div className="preview-bars">
              {[["Yêu cầu JD", 88], ["Ngữ nghĩa", 79], ["AI ranking", 84], ["Độ tin cậy", 76]].map(([label, value]) => (
                <div key={label}><span>{label}</span><i style={{ width: `${value}%` }} /><b>{value}</b></div>
              ))}
            </div>
          </aside>
        </section>

        <section className="landing-band" data-ai-id="why-section">
          <div>
            <p className="landing-kicker">Vì sao nên check trước khi shortlist hoặc ứng tuyển?</p>
            <h2>CV tốt chưa chắc đã khớp JD.</h2>
          </div>
          <p>
            ATS và HR thường nhìn vào keyword, bằng chứng kinh nghiệm và mức độ sát yêu cầu. TalentScan giúp ứng viên tự rà CV, đồng thời giúp HR so sánh nhiều hồ sơ theo cùng một JD thay vì chỉ nhận một điểm chung chung.
          </p>
        </section>

        <section className="workflow-section" id="workflow" data-ai-id="workflow-section">
          <div className="section-heading">
            <p className="landing-kicker">Quy trình hiện tại của hệ thống</p>
            <h2>Từ JD đến báo cáo tuyển dụng trong 4 bước.</h2>
          </div>
          <div className="workflow-grid">
            {steps.map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="checks-section" id="checks" data-ai-id="checks-section">
          <div className="section-heading compact">
            <p className="landing-kicker">AI kiểm tra gì?</p>
            <h2>Báo cáo bám đúng dữ liệu hệ thống đang phân tích.</h2>
          </div>
          <div className="checks-grid">
            {checks.map(([title, text], index) => (
              <article className={index === 0 ? "feature" : ""} key={title}>
                <span><MiniIcon type={index % 3 === 0 ? "scan" : index % 3 === 1 ? "check" : "file"} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="security-strip" data-ai-id="security-strip">
          <div>
            <p className="landing-kicker">Public upload nhưng có kiểm soát</p>
            <h2>Guest được dùng thử, hệ thống vẫn có quota nhiều lớp.</h2>
          </div>
          <ul>
            <li>Giới hạn theo guest session, IP và subnet.</li>
            <li>Giới hạn số upload đồng thời cho guest và toàn hệ thống.</li>
            <li>Turnstile invisible trước khi xử lý file nặng.</li>
          </ul>
        </section>

        <section className="faq-section" id="faq" data-ai-id="faq-section">
          <div className="section-heading compact">
            <p className="landing-kicker">Câu hỏi thường gặp</p>
            <h2>Trước khi bắt đầu.</h2>
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta" data-ai-id="final-cta">
          <p className="landing-kicker">Sẵn sàng kiểm tra?</p>
          <h2>Rà CV và shortlist minh bạch theo từng JD.</h2>
          <Link to="/app" className="landing-cta">Bắt đầu phân tích <MiniIcon type="arrow" /></Link>
        </section>
            </main>
      <footer className="landing-footer">
        <div><strong>TalentScan</strong><span>Phân tích CV theo JD, xếp hạng ứng viên và xuất báo cáo minh bạch.</span></div>
        <nav aria-label="Footer navigation"><Link to="/app">Workspace</Link><Link to="/login">Đăng nhập</Link><a href="#faq">FAQ</a></nav>
      </footer>
    </div>
  );
}