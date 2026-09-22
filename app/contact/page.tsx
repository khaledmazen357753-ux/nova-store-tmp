"use client";

import { FormEvent, useState } from "react";

export default function Contact() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <main>
      <section className="inner-hero"><div className="site-container"><span className="eyebrow">نحن هنا لمساعدتك</span><h1>تواصل معنا.</h1><p>عندك سؤال عن المقاس أو الطلب؟ اكتب لنا، وسنرد عليك بأسرع وقت.</p></div></section>
      <section className="page-content section-light"><div className="site-container"><div className="contact-layout"><div><span className="eyebrow">معلومات التواصل</span><h2 className="contact-title">خلينا نبدأ<br />حديثاً.</h2><p className="contact-copy">فريق Nova Store متاح لمساعدتك من السبت إلى الخميس، من 10 صباحاً حتى 8 مساءً.</p><div className="contact-list"><div><strong>واتساب</strong><span>01000000000</span></div><div><strong>البريد الإلكتروني</strong><span>hello@novastore.eg</span></div><div><strong>العنوان</strong><span>القاهرة، مصر</span></div></div></div><form className="contact-form" onSubmit={handleSubmit}><label>الاسم<input type="text" placeholder="اكتب اسمك" required /></label><label>البريد الإلكتروني<input type="email" placeholder="name@example.com" required /></label><label>رسالتك<textarea rows={5} placeholder="كيف يمكننا مساعدتك؟" required /></label><button type="submit" className="button button-primary">{sent ? "تم إرسال رسالتك ✓" : "إرسال الرسالة"}</button>{sent && <p className="form-success">وصلتنا رسالتك، سنعود إليك قريباً.</p>}</form></div></div></section>
    </main>
  );
}
