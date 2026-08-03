import type { Component } from "solid-js";
import type { TPreviewCard } from "@/types/preview";

import styles from "./Card.module.scss";

type Props = TPreviewCard;

export const PreviewCard: Component<Props> = ({
  title,
  description,
  picture,
}) => {
  return (
    <article class={styles.root}>
      <img class={styles.picture} src={picture} alt={title} />

      <div class={styles.content}>
        <h3 class={styles.title}>{title}</h3>

        <p class={styles.description}>{description}</p>
      </div>
    </article>
  );
};
