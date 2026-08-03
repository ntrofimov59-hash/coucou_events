import type { Component, JSX } from "solid-js";

import styles from "./List.module.scss";

type Props = {
  children: JSX.Element;
};

export const PreviewListWrapper: Component<Props> = ({ children }) => (
  <ul class={styles.root}>{children}</ul>
);
