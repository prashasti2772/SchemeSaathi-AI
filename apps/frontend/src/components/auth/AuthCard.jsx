export default function AuthCard({ title, children }) {
  return <section className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10">
    <h2 className="text-center text-[27px] font-extrabold tracking-tight text-[#172b49]">{title}</h2>
    {children}
  </section>;
}
