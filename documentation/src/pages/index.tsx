import type { ReactNode } from "react";
import clsx from "clsx";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Link from "@docusaurus/Link";
import CodeBlock from "@theme/CodeBlock";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <CodeBlock language="bash" className={styles.installCmd}>
            npm install @ts-rust/std
          </CodeBlock>
          <Link className="button button--secondary button--lg" to="/std">
            Documentation
          </Link>
        </div>
      </div>
    </header>
  );
}

const FeatureList = [
  {
    title: "Safe and Explicit",
    description: (
      <>
        <code>Option</code> and <code>Result</code> types ensure you handle
        optional values and errors explicitly — no more{" "}
        <code>Cannot read property of undefined</code>.
      </>
    ),
  },
  {
    title: "Async Built-in",
    description: (
      <>
        <code>PendingOption</code> and <code>PendingResult</code> bring the
        same safety to async workflows. Chain{" "}
        <code>.map</code>, <code>.andThen</code>, and <code>.unwrapOr</code>{" "}
        across promises without unhandled rejections.
      </>
    ),
  },
  {
    title: "Rust-Inspired API",
    description: (
      <>
        Familiar methods like <code>unwrap</code>, <code>expect</code>,{" "}
        <code>map</code>, and <code>match</code> — modeled after Rust's
        standard library, adapted for TypeScript.
      </>
    ),
  },
];

function Feature({
  title,
  description,
}: {
  title: string;
  description: ReactNode;
}) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HomepageExample(): ReactNode {
  return (
    <section className={styles.example}>
      <div className="container">
        <Heading as="h2" className="text--center">
          Quick Example
        </Heading>
        <CodeBlock language="typescript">
          {`import { some, none, ok, err } from "@ts-rust/std";

// Option: handle missing values explicitly
function findUser(id: number) {
  return id === 1 ? some("Alice") : none();
}

findUser(1).unwrapOr("Guest"); // "Alice"
findUser(2).unwrapOr("Guest"); // "Guest"

// Result: handle errors as values
function divide(a: number, b: number) {
  return b !== 0 ? ok(a / b) : err("Division by zero");
}

divide(10, 2).unwrapOr(0);  // 5
divide(10, 0).unwrapOr(0);  // 0`}
        </CodeBlock>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Documentation"
      description="Rust-inspired utilities for TypeScript"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <HomepageExample />
      </main>
    </Layout>
  );
}
