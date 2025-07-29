import {
  userService,
  categoryService,
  productService,
} from "@/services/database";
import { runMigrations } from "./migrate";

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Run migrations first
    await runMigrations();

    // Create default admin user
    console.log("👤 Creating default admin user...");
    const adminUser = await userService.createUser({
      username: "admin",
      pin: "1234",
      role: "admin",
      isActive: true,
    });
    console.log(`✅ Created admin user: ${adminUser.username}`);

    // Create default manager user
    console.log("👤 Creating default manager user...");
    const managerUser = await userService.createUser({
      username: "manager",
      pin: "5678",
      role: "manager",
      isActive: true,
    });
    console.log(`✅ Created manager user: ${managerUser.username}`);

    // Create default cashier user
    console.log("👤 Creating default cashier user...");
    const cashierUser = await userService.createUser({
      username: "cashier",
      pin: "9999",
      role: "cashier",
      isActive: true,
    });
    console.log(`✅ Created cashier user: ${cashierUser.username}`);

    // Create root categories
    console.log("📂 Creating categories...");

    const booksCategory = await categoryService.createCategory({
      name: "Books",
      description: "Spiritual and religious books",
      keywords: JSON.stringify([
        "books",
        "literature",
        "spiritual",
        "religious",
        "reading",
        "pustaka",
        "kitab",
      ]),
    });

    const accessoriesCategory = await categoryService.createCategory({
      name: "Accessories",
      description: "Religious accessories and items",
      keywords: JSON.stringify([
        "accessories",
        "items",
        "religious",
        "spiritual",
        "upkaran",
        "samagri",
      ]),
    });

    const giftsCategory = await categoryService.createCategory({
      name: "Gifts",
      description: "Gift items and souvenirs",
      keywords: JSON.stringify([
        "gifts",
        "souvenirs",
        "presents",
        "uphar",
        "tohfa",
      ]),
    });

    // Create subcategories for books
    const srilaBooks = await categoryService.createCategory({
      name: "Srila Prabhupada Books",
      description:
        "Books by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
      parentId: booksCategory.id,
      keywords: JSON.stringify([
        "prabhupada",
        "founder",
        "acharya",
        "bhaktivedanta",
        "swami",
      ]),
    });

    const bhagavadGitaBooks = await categoryService.createCategory({
      name: "Bhagavad Gita",
      description: "Bhagavad Gita As It Is and related books",
      parentId: booksCategory.id,
      keywords: JSON.stringify([
        "bhagavad",
        "gita",
        "krishna",
        "arjuna",
        "philosophy",
      ]),
    });

    const srimadBhagavatamBooks = await categoryService.createCategory({
      name: "Srimad Bhagavatam",
      description: "Srimad Bhagavatam sets and individual cantos",
      parentId: booksCategory.id,
      keywords: JSON.stringify([
        "srimad",
        "bhagavatam",
        "purana",
        "krishna",
        "stories",
      ]),
    });

    // Create subcategories for accessories
    const japaAccessories = await categoryService.createCategory({
      name: "Japa Accessories",
      description: "Japa malas, bags, and related items",
      parentId: accessoriesCategory.id,
      keywords: JSON.stringify([
        "japa",
        "mala",
        "chanting",
        "beads",
        "bag",
        "tulsi",
      ]),
    });

    const deityAccessories = await categoryService.createCategory({
      name: "Deity Accessories",
      description: "Items for deity worship",
      parentId: accessoriesCategory.id,
      keywords: JSON.stringify([
        "deity",
        "worship",
        "puja",
        "altar",
        "murti",
        "archana",
      ]),
    });

    console.log("✅ Created categories and subcategories");

    // Create sample products
    console.log("📦 Creating sample products...");

    // Bhagavad Gita products
    const bgAsItIs = await productService.createProduct({
      name: "Bhagavad Gita As It Is",
      description:
        "The complete edition with original Sanskrit verses, word-for-word meanings, translations, and elaborate purports by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
      basePrice: 350.0,
      categoryId: bhagavadGitaBooks.id,
      keywords: JSON.stringify([
        "bhagavad",
        "gita",
        "as it is",
        "prabhupada",
        "krishna",
        "philosophy",
        "complete",
      ]),
      metadata: JSON.stringify({
        author: "A.C. Bhaktivedanta Swami Prabhupada",
        publisher: "The Bhaktivedanta Book Trust",
        language: "English",
        pages: 928,
        isbn: "978-91-7149-781-5",
      }),
    });

    // Create variants for Bhagavad Gita
    await productService.createVariant({
      productId: bgAsItIs.id,
      name: "Hardcover English",
      price: 350.0,
      stockQuantity: 50,
      attributes: JSON.stringify({
        binding: "hardcover",
        language: "english",
        size: "regular",
      }),
      keywords: JSON.stringify(["hardcover", "english", "durable"]),
    });

    await productService.createVariant({
      productId: bgAsItIs.id,
      name: "Paperback English",
      price: 250.0,
      stockQuantity: 100,
      attributes: JSON.stringify({
        binding: "paperback",
        language: "english",
        size: "regular",
      }),
      keywords: JSON.stringify(["paperback", "english", "affordable"]),
    });

    await productService.createVariant({
      productId: bgAsItIs.id,
      name: "Hindi Translation",
      price: 300.0,
      stockQuantity: 30,
      attributes: JSON.stringify({
        binding: "paperback",
        language: "hindi",
        size: "regular",
      }),
      keywords: JSON.stringify(["hindi", "translation", "bhasha"]),
    });

    // Srimad Bhagavatam set
    const sbSet = await productService.createProduct({
      name: "Srimad Bhagavatam Complete Set",
      description:
        "Complete 12 Canto set of Srimad Bhagavatam with original Sanskrit verses, translations, and purports",
      basePrice: 4500.0,
      categoryId: srimadBhagavatamBooks.id,
      keywords: JSON.stringify([
        "srimad",
        "bhagavatam",
        "complete",
        "set",
        "12",
        "canto",
        "purana",
      ]),
      metadata: JSON.stringify({
        author: "A.C. Bhaktivedanta Swami Prabhupada",
        publisher: "The Bhaktivedanta Book Trust",
        volumes: 12,
        totalPages: 4800,
      }),
    });

    await productService.createVariant({
      productId: sbSet.id,
      name: "Hardcover Set",
      price: 4500.0,
      stockQuantity: 10,
      attributes: JSON.stringify({
        binding: "hardcover",
        volumes: 12,
        language: "english",
      }),
      keywords: JSON.stringify(["hardcover", "complete", "set", "premium"]),
    });

    // Japa Mala
    const japaMala = await productService.createProduct({
      name: "Tulsi Japa Mala",
      description:
        "Hand-crafted Tulsi wood japa mala with 108 beads for chanting the holy names",
      basePrice: 150.0,
      categoryId: japaAccessories.id,
      keywords: JSON.stringify([
        "tulsi",
        "japa",
        "mala",
        "beads",
        "chanting",
        "108",
        "holy",
        "names",
      ]),
      metadata: JSON.stringify({
        material: "Tulsi wood",
        beadCount: 108,
        origin: "Vrindavan",
        blessed: true,
      }),
    });

    await productService.createVariant({
      productId: japaMala.id,
      name: "Regular Size",
      price: 150.0,
      stockQuantity: 75,
      attributes: JSON.stringify({ size: "regular", beadSize: "8mm" }),
      keywords: JSON.stringify(["regular", "standard", "8mm"]),
    });

    await productService.createVariant({
      productId: japaMala.id,
      name: "Large Size",
      price: 200.0,
      stockQuantity: 25,
      attributes: JSON.stringify({ size: "large", beadSize: "10mm" }),
      keywords: JSON.stringify(["large", "big", "10mm"]),
    });

    // Japa Bag
    const japaBag = await productService.createProduct({
      name: "Japa Mala Bag",
      description:
        "Cotton japa bag with drawstring for carrying and protecting your japa mala",
      basePrice: 50.0,
      categoryId: japaAccessories.id,
      keywords: JSON.stringify([
        "japa",
        "bag",
        "cotton",
        "drawstring",
        "protection",
        "carry",
      ]),
      metadata: JSON.stringify({
        material: "Cotton",
        closure: "Drawstring",
        washable: true,
      }),
    });

    await productService.createVariant({
      productId: japaBag.id,
      name: "Saffron Color",
      price: 50.0,
      stockQuantity: 40,
      attributes: JSON.stringify({ color: "saffron", material: "cotton" }),
      keywords: JSON.stringify(["saffron", "orange", "traditional"]),
    });

    await productService.createVariant({
      productId: japaBag.id,
      name: "White Color",
      price: 50.0,
      stockQuantity: 30,
      attributes: JSON.stringify({ color: "white", material: "cotton" }),
      keywords: JSON.stringify(["white", "pure", "clean"]),
    });

    console.log("✅ Created sample products with variants");

    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📋 Default Users Created:");
    console.log("  Admin: username=admin, pin=1234");
    console.log("  Manager: username=manager, pin=5678");
    console.log("  Cashier: username=cashier, pin=9999");
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("✅ Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}

export { seedDatabase };
