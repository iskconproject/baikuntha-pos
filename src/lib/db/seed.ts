import { userService } from "@/services/database/users";
import { categoryService } from "@/services/database/categories";
import { productService } from "@/services/database/products";
import { runMigrations } from "./migrate";

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Run migrations first
    await runMigrations();

    // Create default admin user
    console.log("👤 Creating default admin user...");
    let adminUser = await userService.findByUsername("admin");
    if (!adminUser) {
      adminUser = await userService.createUser({
        username: "admin",
        pin: "1234",
        role: "admin",
        isActive: true,
      });
      console.log(`✅ Created admin user: ${adminUser.username}`);
    } else {
      console.log(`✅ Admin user already exists: ${adminUser.username}`);
    }

    // Create default manager user
    console.log("👤 Creating default manager user...");
    let managerUser = await userService.findByUsername("manager");
    if (!managerUser) {
      managerUser = await userService.createUser({
        username: "manager",
        pin: "5678",
        role: "manager",
        isActive: true,
      });
      console.log(`✅ Created manager user: ${managerUser.username}`);
    } else {
      console.log(`✅ Manager user already exists: ${managerUser.username}`);
    }

    // Create default cashier user
    console.log("👤 Creating default cashier user...");
    let cashierUser = await userService.findByUsername("cashier");
    if (!cashierUser) {
      cashierUser = await userService.createUser({
        username: "cashier",
        pin: "9999",
        role: "cashier",
        isActive: true,
      });
      console.log(`✅ Created cashier user: ${cashierUser.username}`);
    } else {
      console.log(`✅ Cashier user already exists: ${cashierUser.username}`);
    }

    // Create root categories
    console.log("📂 Creating categories...");

    let booksCategory = await categoryService.findByName("Books");
    if (!booksCategory) {
      booksCategory = await categoryService.createCategory({
        name: "Books",
        description: "Spiritual and religious books",
        keywords: [
          "books",
          "literature",
          "spiritual",
          "religious",
          "reading",
          "pustaka",
          "kitab",
        ],
        isActive: true,
      });
    }

    let accessoriesCategory = await categoryService.findByName("Accessories");
    if (!accessoriesCategory) {
      accessoriesCategory = await categoryService.createCategory({
        name: "Accessories",
        description: "Religious accessories and items",
        keywords: [
          "accessories",
          "items",
          "religious",
          "spiritual",
          "upkaran",
          "samagri",
        ],
        isActive: true,
      });
    }

    let giftsCategory = await categoryService.findByName("Gifts");
    if (!giftsCategory) {
      giftsCategory = await categoryService.createCategory({
        name: "Gifts",
        description: "Gift items and souvenirs",
        keywords: ["gifts", "souvenirs", "presents", "uphar", "tohfa"],
        isActive: true,
      });
    }

    // Create subcategories for books
    let srilaBooks = await categoryService.findByName("Srila Prabhupada Books");
    if (!srilaBooks) {
      srilaBooks = await categoryService.createCategory({
        name: "Srila Prabhupada Books",
        description:
          "Books by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
        parentId: booksCategory.id,
        keywords: [
          "prabhupada",
          "founder",
          "acharya",
          "bhaktivedanta",
          "swami",
        ],
        isActive: true,
      });
    }

    let bhagavadGitaBooks = await categoryService.findByName("Bhagavad Gita");
    if (!bhagavadGitaBooks) {
      bhagavadGitaBooks = await categoryService.createCategory({
        name: "Bhagavad Gita",
        description: "Bhagavad Gita As It Is and related books",
        parentId: booksCategory.id,
        keywords: ["bhagavad", "gita", "krishna", "arjuna", "philosophy"],
        isActive: true,
      });
    }

    let srimadBhagavatamBooks = await categoryService.findByName(
      "Srimad Bhagavatam"
    );
    if (!srimadBhagavatamBooks) {
      srimadBhagavatamBooks = await categoryService.createCategory({
        name: "Srimad Bhagavatam",
        description: "Srimad Bhagavatam sets and individual cantos",
        parentId: booksCategory.id,
        keywords: ["srimad", "bhagavatam", "purana", "krishna", "stories"],
        isActive: true,
      });
    }

    // Create subcategories for accessories
    let japaAccessories = await categoryService.findByName("Japa Accessories");
    if (!japaAccessories) {
      japaAccessories = await categoryService.createCategory({
        name: "Japa Accessories",
        description: "Japa malas, bags, and related items",
        parentId: accessoriesCategory.id,
        keywords: ["japa", "mala", "chanting", "beads", "bag", "tulsi"],
        isActive: true,
      });
    }

    let deityAccessories = await categoryService.findByName(
      "Deity Accessories"
    );
    if (!deityAccessories) {
      deityAccessories = await categoryService.createCategory({
        name: "Deity Accessories",
        description: "Items for deity worship",
        parentId: accessoriesCategory.id,
        keywords: ["deity", "worship", "puja", "altar", "murti", "archana"],
        isActive: true,
      });
    }

    console.log("✅ Created categories and subcategories");

    // Create sample products
    console.log("📦 Creating sample products...");

    // Check if products already exist
    const existingProducts = await productService.findAll(1);
    if (existingProducts.length > 0) {
      console.log(
        "✅ Sample products already exist, skipping product creation"
      );
      console.log("🎉 Database seeding completed successfully!");
      console.log("\n📋 Default Users Created:");
      console.log("  Admin: username=admin, pin=1234");
      console.log("  Manager: username=manager, pin=5678");
      console.log("  Cashier: username=cashier, pin=9999");
      return;
    }

    // Bhagavad Gita products
    let bgAsItIs = await productService.findByName("Bhagavad Gita As It Is");
    if (!bgAsItIs) {
      bgAsItIs = await productService.createProduct({
        name: "Bhagavad Gita As It Is",
        description:
          "The complete edition with original Sanskrit verses, word-for-word meanings, translations, and elaborate purports by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada",
        basePrice: 350.0,
        categoryId: bhagavadGitaBooks.id,
        keywords: [
          "bhagavad",
          "gita",
          "as it is",
          "prabhupada",
          "krishna",
          "philosophy",
          "complete",
        ],
        metadata: {
          author: "A.C. Bhaktivedanta Swami Prabhupada",
          publisher: "The Bhaktivedanta Book Trust",
          language: "English",
          isbn: "978-91-7149-781-5",
          customAttributes: {
            pages: "928",
          },
        },
        isActive: true,
      });
    }

    // Create variants for Bhagavad Gita
    await productService.createVariant({
      productId: bgAsItIs.id,
      name: "Hardcover English",
      price: 350.0,
      stockQuantity: 50,
      attributes: {
        binding: "hardcover",
        language: "english",
        size: "regular",
      },
      keywords: ["hardcover", "english", "durable"],
    });

    await productService.createVariant({
      productId: bgAsItIs.id,
      name: "Paperback English",
      price: 250.0,
      stockQuantity: 100,
      attributes: {
        binding: "paperback",
        language: "english",
        size: "regular",
      },
      keywords: ["paperback", "english", "affordable"],
    });

    await productService.createVariant({
      productId: bgAsItIs.id,
      name: "Hindi Translation",
      price: 300.0,
      stockQuantity: 30,
      attributes: {
        binding: "paperback",
        language: "hindi",
        size: "regular",
      },
      keywords: ["hindi", "translation", "bhasha"],
    });

    // Srimad Bhagavatam set
    const sbSet = await productService.createProduct({
      name: "Srimad Bhagavatam Complete Set",
      description:
        "Complete 12 Canto set of Srimad Bhagavatam with original Sanskrit verses, translations, and purports",
      basePrice: 4500.0,
      categoryId: srimadBhagavatamBooks.id,
      keywords: [
        "srimad",
        "bhagavatam",
        "complete",
        "set",
        "12",
        "canto",
        "purana",
      ],
      metadata: {
        author: "A.C. Bhaktivedanta Swami Prabhupada",
        publisher: "The Bhaktivedanta Book Trust",
        customAttributes: {
          volumes: "12",
          totalPages: "4800",
        },
      },
      isActive: true,
    });

    await productService.createVariant({
      productId: sbSet.id,
      name: "Hardcover Set",
      price: 4500.0,
      stockQuantity: 10,
      attributes: {
        binding: "hardcover",
        volumes: "12",
        language: "english",
      },
      keywords: ["hardcover", "complete", "set", "premium"],
    });

    // Japa Mala
    const japaMala = await productService.createProduct({
      name: "Tulsi Japa Mala",
      description:
        "Hand-crafted Tulsi wood japa mala with 108 beads for chanting the holy names",
      basePrice: 150.0,
      categoryId: japaAccessories.id,
      keywords: [
        "tulsi",
        "japa",
        "mala",
        "beads",
        "chanting",
        "108",
        "holy",
        "names",
      ],
      metadata: {
        material: "Tulsi wood",
        customAttributes: {
          beadCount: "108",
          origin: "Vrindavan",
          blessed: "true",
        },
      },
      isActive: true,
    });

    await productService.createVariant({
      productId: japaMala.id,
      name: "Regular Size",
      price: 150.0,
      stockQuantity: 75,
      attributes: { size: "regular", beadSize: "8mm" },
      keywords: ["regular", "standard", "8mm"],
    });

    await productService.createVariant({
      productId: japaMala.id,
      name: "Large Size",
      price: 200.0,
      stockQuantity: 25,
      attributes: { size: "large", beadSize: "10mm" },
      keywords: ["large", "big", "10mm"],
    });

    // Japa Bag
    const japaBag = await productService.createProduct({
      name: "Japa Mala Bag",
      description:
        "Cotton japa bag with drawstring for carrying and protecting your japa mala",
      basePrice: 50.0,
      categoryId: japaAccessories.id,
      keywords: ["japa", "bag", "cotton", "drawstring", "protection", "carry"],
      metadata: {
        material: "Cotton",
        customAttributes: {
          closure: "Drawstring",
          washable: "true",
        },
      },
      isActive: true,
    });

    await productService.createVariant({
      productId: japaBag.id,
      name: "Saffron Color",
      price: 50.0,
      stockQuantity: 40,
      attributes: { color: "saffron", material: "cotton" },
      keywords: ["saffron", "orange", "traditional"],
    });

    await productService.createVariant({
      productId: japaBag.id,
      name: "White Color",
      price: 50.0,
      stockQuantity: 30,
      attributes: { color: "white", material: "cotton" },
      keywords: ["white", "pure", "clean"],
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
