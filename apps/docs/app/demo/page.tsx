import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { DemoStage } from "../../components/DemoStage";

export const metadata = {
  title: "Demo"
};

export default function DemoPage() {
  return (
    <>
      <Header />
      <main className="shell">
        <section className="page-hero">
          <h1>Live data, agent targets, generative surfaces.</h1>
          <p className="lead">This page loads the same browser bundle host apps embed. Watch source-bound fields update, or copy a scoped prompt so your local coding agent can render lightcode into this page through the LensUI bridge.</p>
        </section>
        <DemoStage />
      </main>
      <Footer />
    </>
  );
}
