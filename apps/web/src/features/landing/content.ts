import { IN_DEMAND_IDS, MAINS } from "@/features/order-flow/constants/menu";

export const LANDING_ASSETS = {
  heroFamily: {
    src: "/images/chefmate/hero-family-evening.png",
    alt: "A family relaxing on the sofa while a Chefmate chef cooks in their home kitchen",
  },
  homework: {
    src: "/images/chefmate/story-homework-time.png",
    alt: "A parent helping a child with homework while a Chefmate chef cooks in the background",
  },
  afterWork: {
    src: "/images/chefmate/story-after-work.png",
    alt: "A customer smiling at her phone on the sofa, feet up, while a Chefmate chef preps dinner in the kitchen behind her",
  },
  couple: {
    src: "/images/chefmate/story-couple-time.png",
    alt: "A couple catching up on the sofa while a Chefmate chef prepares dinner behind them",
  },
  groceryHandoff: {
    src: "/images/chefmate/trust-grocery-handoff.png",
    alt: "A customer and Chefmate chef reviewing fresh groceries together in the kitchen",
  },
  chefCooking: {
    src: "/images/chefmate/trust-chef-sprinkling-salt.png",
    alt: "A Chefmate chef seasoning food in a pan with fresh ingredients on the counter",
  },
  familyDinner: {
    src: "/images/chefmate/outcome-family-dinner.png",
    alt: "A family eating dinner at home while the Chefmate chef finishes in the kitchen",
  },
  mealPrep: {
    src: "/images/chefmate/category-meal-prep.png",
    alt: "A Chefmate chef portioning fresh cooked meals into containers",
  },
} as const;

export const HOW_IT_WORKS = [
  {
    title: "Choose & Book",
    body: "Choose a meal and a time that suits your household.",
    image: "/images/chefmate/how-it-works/book-a-time.jpg",
    alt: "A customer booking a Chefmate cooking session from home",
    imagePosition: "center top",
  },
  {
    title: "Get Your Shopping List",
    body: "We send the ingredients you need before the session.",
    image: "/images/chefmate/how-it-works/shopping.jpg",
    alt: "Fresh ingredients being selected during grocery shopping",
    imagePosition: "center top",
  },
  {
    title: "A Chef Cooks in Your Kitchen",
    body: "Your Chefmate arrives and prepares everything fresh at home.",
    image: "/images/chefmate/how-it-works/chef-prepping.png",
    alt: "A Chefmate chef chopping fresh vegetables in a home kitchen",
    imagePosition: "left center",
  },
  {
    title: "Sit Down. We Clean Up.",
    body: "Dinner is served and the kitchen is left tidy.",
    image: "/images/chefmate/how-it-works/family-relax-while-chef-cleans.jpg",
    alt: "A family relaxing while a Chefmate chef cleans up in the kitchen",
    imagePosition: "center center",
  },
] as const;

export const HERO_STORIES = [
  {
    asset: LANDING_ASSETS.heroFamily,
    title: "Dinner is handled. Your evening is yours.",
    body: "A Chefmate chef cooks everyday meals in your kitchen, so you can switch off, catch up and enjoy being home.",
  },
  {
    asset: LANDING_ASSETS.homework,
    title: "More time to hear about their day.",
    body: "Less time worrying about dinner. Your Chefmate takes care of the cooking, so you can listen, help with homework, and be present for the moments that matter.",
  },
  {
    asset: LANDING_ASSETS.afterWork,
    title: "Come home. Switch off. Let someone else cook.",
    body: "Real dinner, prepared in your kitchen, without turning the end of your day into another shift.",
  },
  {
    asset: LANDING_ASSETS.couple,
    title: "Catch up with each other.",
    body: "We'll take care of what's for dinner: real food, cooked at home while you enjoy the evening.",
  },
] as const;

export const POPULAR_MEALS = IN_DEMAND_IDS.map((id) => MAINS.find((meal) => meal.id === id)).filter(
  (meal): meal is (typeof MAINS)[number] => Boolean(meal),
);

export const CATEGORIES = [
  {
    title: "Sunday Colors",
    body: "Bold, vibrant meals for feel-good Sundays.",
    image: "/images/meals/sunday-lunch/roast-chicken-seven-colours.webp",
    alt: "Roast chicken with seven colors Sunday lunch sides",
  },
  {
    title: "Healthy Meal Preps",
    body: "Balanced, nourishing meals made for your week.",
    image: LANDING_ASSETS.mealPrep.src,
    alt: LANDING_ASSETS.mealPrep.alt,
  },
  {
    title: "Traditional Favorites",
    body: "Comforting classics, cooked to perfection.",
    image: "/images/meals/sunday-lunch/oxtail-seven-colours.webp",
    alt: "Oxtail served with traditional seven colors sides",
  },
] as const;
