import { describe, expect, it } from "vitest";
import { SIDES } from "@/features/order-flow/constants/menu";

describe("side menu", () => {
  it("uses every supplied side image with a matching card name", () => {
    expect(SIDES.map((side) => ({ name: side.name, imageSrc: side.imageSrc }))).toEqual([
      { name: "Beetroot Salad", imageSrc: "/images/menu/sides/beetroot.jpg" },
      { name: "Coleslaw", imageSrc: "/images/menu/sides/coleslaw.jpg" },
      { name: "Creamed Spinach", imageSrc: "/images/menu/sides/creamed-spinach.jpg" },
      { name: "Green Salad", imageSrc: "/images/menu/sides/green-salad.jpg" },
      { name: "Mielies", imageSrc: "/images/menu/sides/mielies.jpg" },
      { name: "Tuna Pasta Salad", imageSrc: "/images/menu/sides/tuna-pasta-salad.jpg" },
      { name: "Potato Salad", imageSrc: "/images/menu/sides/potato-salad.jpg" },
      { name: "Pumpkin & Rocket Salad", imageSrc: "/images/menu/sides/pumpkin-rocket-salad.jpg" },
    ]);
  });
});
