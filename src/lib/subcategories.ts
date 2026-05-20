// Static subcategory map keyed by main category slug. Used for hover menus.
export const SUBCATEGORIES: Record<string, string[]> = {
  "restaurants-food": [
    "Chinese", "Italian", "Indian", "Japanese / Sushi", "Mexican",
    "Pizza", "Burgers", "Cafés", "Bakery", "Vegan / Vegetarian", "Halal",
  ],
  "beauty-personal-care": [
    "Hair Salon", "Barber", "Nails", "Spa", "Massage", "Tattoo", "Eyelashes", "Waxing",
  ],
  "health-wellness": [
    "Dentist", "Doctor / Clinic", "Chiropractor", "Physiotherapy",
    "Gym & Fitness", "Yoga", "Optometrist",
  ],
  "home-services": [
    "Plumber", "Electrician", "HVAC", "Cleaning", "Landscaping",
    "Handyman", "Roofing", "Painting", "Moving",
  ],
  "automotive": [
    "Mechanic", "Tire Shop", "Oil Change", "Car Wash & Detailing",
    "Body Shop", "Towing", "Auto Glass",
  ],
  "professional-services": [
    "Lawyer", "Accountant", "Real Estate Agent", "Photographer",
    "Marketing", "Insurance", "IT Services",
  ],
  "shopping-retail": [
    "Grocery", "Florist", "Pet Store", "Clothing",
    "Bookstore", "Jewelry", "Electronics",
  ],
  "events-entertainment": [
    "DJ", "Wedding Planner", "Catering", "Venues",
    "Photography", "Live Music", "Party Rentals",
  ],
};
