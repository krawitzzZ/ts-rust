import type { ReactNode } from "react";
import clsx from "clsx";
import Heading from "@theme/Heading";
import Link from "@docusaurus/Link";
import mountain from "@site/static/img/undraw_docusaurus_mountain.svg";
import tree from "@site/static/img/undraw_docusaurus_tree.svg";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Svg: typeof mountain;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Safe and Explicit",
    Svg: mountain,
    description: (
      <>
        <code>@ts-rust/std</code> brings Rust-inspired{" "}
        <Link to="/std/optional">
          {" "}
          <code>Option</code>{" "}
        </Link>{" "}
        and{" "}
        <Link to="/std/resultant">
          {" "}
          <code>Result</code>{" "}
        </Link>{" "}
        types to TypeScript, ensuring you handle optional values and errors
        explicitly to prevent runtime surprises.
      </>
    ),
  },
  {
    title: "Write Predictable Code",
    Svg: tree,
    description: (
      <>
        Focus on building robust applications with <code>@ts-rust/std</code>.
        Its utilities help you manage success, failure, and errors in a
        disciplined way, making your TypeScript code more reliable.
      </>
    ),
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx("col col--6")}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
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
