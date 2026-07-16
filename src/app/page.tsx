import { Hero } from "@/features/hero/Hero";
import { HowItWorks } from "@/features/how-it-works/HowItWorks";
import { MenuShowcase } from "@/features/menu-showcase/MenuShowcase";
import { createMealsRepository } from "@/data/repository";

export default async function Home() {
  const repository = createMealsRepository();
  const [categories, meals] = await Promise.all([
    repository.getCategories(),
    repository.findAll(),
  ]);

  return (
    <>
      <MenuShowcase />
      <Hero categories={categories} meals={meals} />
      <HowItWorks />
    </>
  );
}
