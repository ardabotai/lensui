import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { InteractiveLensUIDemo } from "../../components/InteractiveLensUIDemo";
import { specimens } from "../../lib/specimens";

export const metadata = {
  title: "Specimens"
};

export default function ComponentsPage() {
  return (
    <>
      <Header />
      <main className="wide-shell">
        <section className="page-hero">
          <h1>Maximum visual range, minimum model syntax.</h1>
          <p className="lead">Each specimen below is rendered by the real LensUI browser runtime from compact lightcode. The model sends semantic rows and LightStyle tokens; the renderer owns hierarchy, polish, system light/dark colors, responsive fitting, live bindings, and host adapters.</p>
        </section>

        <section className="stats" aria-label="LensUI goals">
          <div className="stat"><strong>1</strong><span>depth token per line</span></div>
          <div className="stat"><strong>0</strong><span>DOM classes in normal renders</span></div>
          <div className="stat"><strong>9</strong><span>specimens rendered by the runtime</span></div>
          <div className="stat"><strong>1</strong><span>runtime contract for DOM and native adapters</span></div>
        </section>

        <section className="style-strip" aria-label="LensUI built-in style packs">
          <article className="style-card">
            <code>0F|st=mono</code>
            <h2>Mono</h2>
            <p>Monochrome, compact, grid-backed, system light/dark, and easy to scan on large screens or embedded surfaces.</p>
          </article>
          <article className="style-card studio">
            <code>0F|st=studio</code>
            <h2>Studio</h2>
            <p>Product direction with paired light/dark palettes, cool accents, quiet contrast, and modern display/body typography.</p>
          </article>
        </section>

        <section className="grid specimens-grid" aria-label="LensUI lightcode specimens">
          {specimens.map((fixture) => (
            <article className="specimen" key={fixture.name}>
              <div className="specimen-head">
                <div>
                  <h2>{fixture.name}</h2>
                  <p className="why">{fixture.why}</p>
                </div>
                <div className="tokens">{fixture.lightcode.trim().split("\n").length} lines</div>
              </div>
              <InteractiveLensUIDemo
                className="specimen-playground"
                lightcode={fixture.lightcode}
                title={fixture.name}
              />
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
