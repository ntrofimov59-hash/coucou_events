import type { TPreviewCard } from "@/types/preview";
import type { Component } from "solid-js";
import { PreviewCard } from "./Card";
import { PreviewListWrapper } from "./List";

type Props = {
  previews: TPreviewCard[];
};

export const PreviewList: Component<Props> = ({ previews }) => (
  <PreviewListWrapper>
    {previews.map((preview) => (
      <PreviewCard {...preview} />
    ))}
  </PreviewListWrapper>
);
