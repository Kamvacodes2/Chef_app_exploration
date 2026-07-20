import { Hero } from "@/features/hero/Hero";
import { HowItWorks } from "@/features/how-it-works/HowItWorks";
import { MenuShowcase } from "@/features/menu-showcase/MenuShowcase";
import { OrderFlow } from "@/features/order-flow/OrderFlow";
import { createMealsRepository } from "@/data/repository";
import { SiteHeader } from "@/components/SiteHeader";

export default async function Home() {
  const repository = createMealsRepository();
  const [categories, meals] = await Promise.all([
    repository.getCategories(),
    repository.findAll(),
  ]);

  return (
    <>
      <SiteHeader />
      <MenuShowcase />
      <Hero categories={categories} meals={meals} />
      <OrderFlow />
      <HowItWorks />
    </>
  );
}
