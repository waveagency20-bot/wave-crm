import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#080E08] text-white overflow-x-hidden font-sans">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080E08]/90 backdrop-blur-md border-b border-[#00FF6A]/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="36" height="22" viewBox="0 0 120 60" fill="none">
              <path d="M5 30 C20 30 20 10 35 10 C50 10 50 50 65 50 C80 50 80 10 95 10 C110 10 110 30 115 30"
                stroke="#00FF6A" strokeWidth="7" strokeLinecap="round" fill="none"/>
            </svg>
            <span className="font-black text-xl tracking-tight">wave<span className="text-[#00FF6A]">.</span><span className="text-sm font-semibold text-white/50 ml-1 tracking-widest uppercase">CRM</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#features" className="hover:text-[#00FF6A] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#00FF6A] transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors px-4 py-2">
              Sign in
            </Link>
            <Link href="/signup" className="text-sm bg-[#00FF6A] hover:bg-[#00E85C] text-black font-bold px-5 py-2.5 rounded-lg transition-all hover:scale-105">
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#00FF6A]/6 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 border border-[#00FF6A]/25 bg-[#00FF6A]/5 rounded-full px-4 py-1.5 text-sm text-[#00FF6A]/80 mb-10">
            <span className="w-2 h-2 rounded-full bg-[#00FF6A] animate-pulse"></span>
            Built for African businesses — M-Pesa, SMS & WhatsApp ready
          </div>

          <div className="flex justify-center mb-8">
            <svg width="120" height="50" viewBox="0 0 120 50" fill="none">
              <path d="M5 25 C20 25 20 8 35 8 C50 8 50 42 65 42 C80 42 80 8 95 8 C110 8 110 25 115 25"
                stroke="#00FF6A" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.9"/>
              <path d="M5 25 C20 25 20 8 35 8 C50 8 50 42 65 42 C80 42 80 8 95 8 C110 8 110 25 115 25"
                stroke="#00FF6A" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.15"/>
            </svg>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            The CRM that speaks<br/>
            <span className="text-[#00FF6A]">your market</span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Wave CRM is the all-in-one customer platform built for Kenyan and African businesses.
            Manage leads, follow up with customers on WhatsApp and SMS — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-[#00FF6A] hover:bg-[#00E85C] text-black font-black px-8 py-4 rounded-xl text-base transition-all hover:scale-105 tracking-tight">
              Start 7-day free trial
            </Link>
            <a href="#features" className="bg-white/5 hover:bg-white/8 border border-white/10 hover:border-[#00FF6A]/30 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all">
              See all features
            </a>
          </div>
          <p className="text-sm text-white/25 mt-5">No credit card required · Cancel anytime</p>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-5xl mx-auto mt-20 relative">
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#080E08] to-transparent z-10 pointer-events-none" />
          <div className="rounded-2xl border border-[#00FF6A]/15 bg-[#0C130C] overflow-hidden shadow-2xl shadow-[#00FF6A]/5">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#00FF6A]/10 bg-[#080E08]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C940]" />
              </div>
              <div className="flex-1 mx-6 bg-white/5 rounded-md px-3 py-1 text-xs text-white/20 text-center">
                app.wavecrm.co.ke/dashboard
              </div>
              <div className="w-16" />
            </div>
            <div className="flex">
              <div className="w-48 border-r border-[#00FF6A]/8 p-4 hidden md:block">
                <div className="flex items-center gap-2 mb-6">
                  <svg width="18" height="11" viewBox="0 0 120 60" fill="none">
                    <path d="M5 30 C20 30 20 10 35 10 C50 10 50 50 65 50 C80 50 80 10 95 10 C110 10 110 30 115 30"
                      stroke="#00FF6A" strokeWidth="8" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs font-black">wave<span className="text-[#00FF6A]">.</span></span>
                </div>
                {["Dashboard","Contacts","Leads","Pipeline","Tasks","Messages","Campaigns"].map((item, i) => (
                  <div key={item} className={`text-xs px-3 py-2 rounded-lg mb-1 ${i===0 ? 'bg-[#00FF6A]/15 text-[#00FF6A] font-semibold' : 'text-white/30'}`}>
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-5">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    {label:"Total Leads",value:"1,284",change:"+12%"},
                    {label:"Deals Won",value:"KES 4.2M",change:"+8%"},
                    {label:"Open Tasks",value:"47",change:"-3"},
                    {label:"Contacts",value:"892",change:"+34"},
                  ].map(s=>(
                    <div key={s.label} className="bg-[#00FF6A]/5 border border-[#00FF6A]/10 rounded-xl p-3">
                      <p className="text-[9px] text-white/35 mb-1">{s.label}</p>
                      <p className="text-base font-bold">{s.value}</p>
                      <p className="text-[9px] mt-0.5 text-[#00FF6A]">{s.change}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 bg-[#00FF6A]/4 border border-[#00FF6A]/8 rounded-xl p-3">
                    <p className="text-[9px] text-white/35 mb-2">Pipeline</p>
                    <div className="flex gap-1.5 h-14 items-end">
                      {[55,75,40,88,60,72,80,45,68,58,82,50].map((h,i)=>(
                        <div key={i} className="flex-1 rounded-sm" style={{height:`${h}%`,background:'rgba(0,255,106,0.45)'}} />
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#00FF6A]/4 border border-[#00FF6A]/8 rounded-xl p-3">
                    <p className="text-[9px] text-white/35 mb-2">Recent activity</p>
                    {["James O. — call","Amina K. — deal","Brian M. — task"].map(n=>(
                      <div key={n} className="text-[9px] text-white/40 py-1 border-b border-white/5 last:border-0">{n}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="py-10 px-6 border-y border-[#00FF6A]/8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-white/25 mb-5 uppercase tracking-[0.2em]">Trusted by businesses across Kenya</p>
          <div className="flex flex-wrap justify-center gap-10 text-white/20 text-sm font-bold tracking-wide">
            {["Nairobi Ventures","Savanna Tech","Kilimani Motors","Westlands Realty","Mombasa Traders","Kisumu Digital"].map(n=>(
              <span key={n} className="hover:text-[#00FF6A]/50 transition-colors">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Everything you need to grow</h2>
            <p className="text-white/45 text-lg max-w-xl mx-auto">Built for African market realities — mobile-first, SMS native, WhatsApp ready.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {emoji:"👥",title:"Lead & Contact Management",desc:"Capture leads from web forms, WhatsApp, and referrals. Score, assign, and track every deal through a visual Kanban pipeline."},
              {emoji:"💬",title:"WhatsApp & SMS Campaigns",desc:"Send bulk SMS to your contacts. Receive and reply to WhatsApp messages directly from the CRM."},
              {emoji:"✅",title:"Tasks & Team Collaboration",desc:"Assign follow-up tasks, set reminders, and collaborate in real time with full activity logs."},
              {emoji:"📊",title:"Analytics & Reporting",desc:"Track conversion rates, revenue by agent, and campaign performance. Export reports to Excel."},
              {emoji:"🔐",title:"Role-Based Access Control",desc:"Admin, Manager, and Agent roles with granular permissions. Multi-org support for agencies."},
              {emoji:"⚡",title:"Real-Time Updates",desc:"Pipeline, messages, and tasks update in real time across all devices. No refresh needed."},
            ].map(f=>(
              <div key={f.title} className="rounded-2xl p-6 border transition-all hover:scale-[1.02]"
                style={{background:'rgba(0,255,106,0.06)',borderColor:'rgba(0,255,106,0.14)'}}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
                  style={{background:'rgba(0,255,106,0.1)',border:'0.5px solid rgba(0,255,106,0.2)'}}>
                  {f.emoji}
                </div>
                <h3 className="font-bold text-base mb-2 text-[#00FF6A]">{f.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Simple, local pricing</h2>
          <p className="text-white/45 text-lg mb-14">Priced for Kenyan businesses. Pay in KES via M-Pesa. Cancel anytime.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                name:"Starter",
                price:"KES 3,500",
                per:"/month",
                desc:"For small businesses just getting started.",
                features:["1-3 users","500 contacts","500 SMS/month","Basic pipeline","Email support","7-day free trial"],
                cta:"Start free trial",
                hot:false,
              },
              {
                name:"Growth",
                price:"KES 8,500",
                per:"/month",
                desc:"For growing teams that need more power.",
                features:["1-10 users","5,000 contacts","2,000 SMS/month","WhatsApp inbound","Full analytics","Priority support","7-day free trial"],
                cta:"Start free trial",
                hot:true,
              },
              {
                name:"Enterprise",
                price:"KES 16,500",
                per:"/month",
                desc:"For agencies and large organisations.",
                features:["Unlimited users","Unlimited contacts","5,000 SMS/month","Custom Sender ID","WhatsApp campaigns","Dedicated account manager","Custom onboarding"],
                cta:"Contact sales",
                hot:false,
              },
            ].map(p=>(
              <div key={p.name} className={`rounded-2xl p-6 text-left border transition-all ${p.hot ? 'border-[#00FF6A]/50 bg-[#00FF6A]/8 scale-105' : 'border-[#00FF6A]/12 bg-[#00FF6A]/3'}`}>
                {p.hot && <div className="inline-block bg-[#00FF6A] text-black text-xs font-black px-3 py-1 rounded-full mb-4 tracking-wide">MOST POPULAR</div>}
                <p className="font-black text-lg">{p.name}</p>
                <div className="flex items-baseline gap-1 mt-2 mb-1">
                  <span className={`text-3xl font-black ${p.hot ? 'text-[#00FF6A]' : 'text-white'}`}>{p.price}</span>
                  <span className="text-white/35 text-sm">{p.per}</span>
                </div>
                <p className="text-white/40 text-sm mb-6">{p.desc}</p>
                <ul className="space-y-2 mb-8">
                  {p.features.map(f=>(
                    <li key={f} className="flex items-center gap-2 text-sm text-white/65">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="#00FF6A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.cta==="Contact sales"?"/contact":"/signup"}
                  className={`block text-center py-3 rounded-xl text-sm font-bold transition-all ${p.hot ? 'bg-[#00FF6A] hover:bg-[#00E85C] text-black' : 'bg-white/5 hover:bg-white/8 text-white border border-[#00FF6A]/20 hover:border-[#00FF6A]/40'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#00FF6A]/4 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00FF6A]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00FF6A]/40 to-transparent" />
        <div className="max-w-2xl mx-auto text-center relative">
          <div className="flex justify-center mb-6">
            <svg width="80" height="34" viewBox="0 0 120 50" fill="none">
              <path d="M5 25 C20 25 20 8 35 8 C50 8 50 42 65 42 C80 42 80 8 95 8 C110 8 110 25 115 25"
                stroke="#00FF6A" strokeWidth="6" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Ready to grow your business?</h2>
          <p className="text-white/50 text-lg mb-10">
            Join hundreds of Kenyan businesses using Wave CRM to close more deals and serve customers better.
          </p>
          <Link href="/signup" className="inline-block bg-[#00FF6A] hover:bg-[#00E85C] text-black font-black px-10 py-4 rounded-xl text-base transition-all hover:scale-105">
            Start your free 7-day trial
          </Link>
          <p className="text-sm text-white/25 mt-4">No credit card · Free onboarding call · Cancel anytime</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#00FF6A]/10 py-12 px-6 bg-[#060C06]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg width="28" height="14" viewBox="0 0 120 60" fill="none">
                  <path d="M5 30 C20 30 20 10 35 10 C50 10 50 50 65 50 C80 50 80 10 95 10 C110 10 110 30 115 30"
                    stroke="#00FF6A" strokeWidth="9" strokeLinecap="round"/>
                </svg>
                <span className="font-black text-base">wave<span className="text-[#00FF6A]">.</span><span className="text-xs text-white/30 ml-1 font-normal tracking-widest uppercase">CRM</span></span>
              </div>
              <p className="text-white/35 text-sm leading-relaxed">The CRM built for African businesses. Nairobi-based, globally ready.</p>
            </div>
            <div>
              <p className="font-bold text-sm mb-4 text-white/70">Product</p>
              <ul className="space-y-2 text-sm text-white/35">
                {["Features","Pricing","Changelog"].map(l=>(
                  <li key={l}><a href="#" className="hover:text-[#00FF6A] transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-bold text-sm mb-4 text-white/70">Company</p>
              <ul className="space-y-2 text-sm text-white/35">
                {["About","Blog","Careers","Contact"].map(l=>(
                  <li key={l}><a href="#" className="hover:text-[#00FF6A] transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-bold text-sm mb-4 text-white/70">Legal</p>
              <ul className="space-y-2 text-sm text-white/35">
                <li><Link href="/privacy-policy" className="hover:text-[#00FF6A] transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-[#00FF6A] transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#00FF6A]/8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/25 text-sm">© 2026 Wave CRM. All rights reserved.</p>
            <p className="text-white/20 text-sm">Made with love in Nairobi, Kenya</p>
          </div>
        </div>
      </footer>

    </main>
  );
}