import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "app.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT DEFAULT '',
  location TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  header_url TEXT DEFAULT '',
  verified INTEGER NOT NULL DEFAULT 0,
  pinned_tweet_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tweets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  parent_id TEXT REFERENCES tweets(id) ON DELETE CASCADE,
  quote_of_id TEXT REFERENCES tweets(id) ON DELETE SET NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, tweet_id)
);

CREATE TABLE IF NOT EXISTS retweets (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, tweet_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, tweet_id)
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  tweet_id TEXT REFERENCES tweets(id) ON DELETE CASCADE,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS polls (
  tweet_id TEXT PRIMARY KEY REFERENCES tweets(id) ON DELETE CASCADE,
  options TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS poll_votes (
  tweet_id TEXT NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tweet_id, user_id)
);

CREATE TABLE IF NOT EXISTS mutes (
  muter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (muter_id, muted_id)
);
`);

function ensureColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("users", "verified", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "pinned_tweet_id", "TEXT");
ensureColumn("tweets", "quote_of_id", "TEXT REFERENCES tweets(id) ON DELETE SET NULL");
ensureColumn("tweets", "view_count", "INTEGER NOT NULL DEFAULT 0");

function seedIfEmpty() {
  const count = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  if (count > 0) return;

  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  const now = () => new Date().toISOString();

  const insertUser = db.prepare(
    `INSERT INTO users (id, username, name, email, password_hash, bio, location, avatar_url, header_url, verified, created_at)
     VALUES (@id, @username, @name, @email, @password_hash, @bio, @location, '', '', @verified, @created_at)`
  );

  const originalUsers: { username: string; name: string; bio: string; location: string; verified?: boolean; joinedDaysAgo: number }[] = [
    { username: "chiko", name: "Chiko", bio: "ვაშენებ ვებ-პროდუქტებს. Next.js, TypeScript, ქსელები.", location: "ბათუმი", joinedDaysAgo: 400 },
    { username: "elene_dev", name: "Elene Kapanadze", bio: "Frontend engineer. კავა ჯერ, კოდი მერე.", location: "თბილისი", joinedDaysAgo: 620, verified: true },
    { username: "giorgi_ux", name: "Giorgi Beridze", bio: "Product designer. მინიმალიზმის თაყვანისმცემელი.", location: "ქუთაისი", joinedDaysAgo: 500 },
    { username: "newsbot", name: "Daily Tech News", bio: "ტექნოლოგიური სიახლეები ყოველდღე, ავტომატურად.", location: "", joinedDaysAgo: 900, verified: true },
    { username: "nini_photo", name: "Nini Lomidze", bio: "ფოტოგრაფი 📸 ბუნება და ქუჩის ცხოვრება.", location: "სვანეთი", joinedDaysAgo: 300 },
    { username: "luka_music", name: "Luka Tsiklauri", bio: "მუსიკოსი და პროდიუსერი. ახალი სინგლი მალე 🎧", location: "თბილისი", joinedDaysAgo: 250 },
    { username: "mariam_chef", name: "Mariam Japaridze", bio: "შეფ-მზარეული. ქართული სამზარეულო თანამედროვედ.", location: "თბილისი", joinedDaysAgo: 700 },
    { username: "davit_startup", name: "Davit Mchedlishvili", bio: "დამფუძნებელი @ სტარტაპი. მშენებლობაში ვარ.", location: "თბილისი", joinedDaysAgo: 550 },
    { username: "ana_travels", name: "Ana Gogia", bio: "მოგზაურობა + წერა. 34 ქვეყანა და ვაგრძელებ.", location: "საქართველო", joinedDaysAgo: 480 },
    { username: "beka_gamer", name: "Beka Kiknadze", bio: "სთრიმერი. RPG თამაშები და რეტრო კონსოლები.", location: "ბათუმი", joinedDaysAgo: 200 },
    { username: "tamar_law", name: "Tamar Ivanishvili", bio: "იურისტი. ტექნოლოგიური სამართალი მაინტერესებს.", location: "თბილისი", joinedDaysAgo: 610 },
    { username: "sport_ge", name: "სპორტის სიახლეები", bio: "ქართული და მსოფლიო სპორტის სიახლეები.", location: "", joinedDaysAgo: 850, verified: true },
    { username: "irakli_arch", name: "Irakli Natsvlishvili", bio: "არქიტექტორი. ძველი თბილისის შენარჩუნება.", location: "თბილისი", joinedDaysAgo: 430 },
    { username: "salome_art", name: "Salome Beruashvili", bio: "მხატვარი. ციფრული ილუსტრაცია და კომიქსები.", location: "ქუთაისი", joinedDaysAgo: 190 },
    { username: "zura_finance", name: "Zurab Kobalia", bio: "საინვესტიციო ანალიტიკოსი. საკუთარი აზრი, არა რჩევა.", location: "თბილისი", joinedDaysAgo: 380 },
    { username: "nutsa_science", name: "Nutsa Chkheidze", bio: "ბიოლოგი. მეცნიერება უნდა იყოს ყველასთვის გასაგები.", location: "თბილისი", joinedDaysAgo: 340 },
    { username: "koba_football", name: "Koba Lomaia", bio: "ყოფილი ფეხბურთელი, ახლა კომენტატორი.", location: "ბათუმი", joinedDaysAgo: 900, verified: true },
    { username: "mari_books", name: "Mari Sanikidze", bio: "წიგნები, წიგნები და კიდევ წიგნები 📚", location: "თელავი", joinedDaysAgo: 260 },
  ];

  type Topic =
    | "gaming" | "fitness" | "medicine" | "education" | "film"
    | "automotive" | "environment" | "crypto" | "comedy" | "food"
    | "music" | "fashion" | "travel" | "business" | "literature"
    | "basketball" | "art" | "astronomy" | "chess" | "pets";

  const newUsers: { username: string; name: string; bio: string; location: string; verified?: boolean; joinedDaysAgo: number; topic: Topic }[] = [
    { username: "sandro_esports", name: "Sandro Kldiashvili", bio: "პროფესიონალი გეიმერი. eSports გუნდის კაპიტანი.", location: "თბილისი", joinedDaysAgo: 220, topic: "gaming" },
    { username: "mariami_streams", name: "Mariami Getia", bio: "სთრიმერი. RPG და indie თამაშები.", location: "ქუთაისი", joinedDaysAgo: 180, topic: "gaming" },
    { username: "levan_fitness", name: "Levan Tabidze", bio: "პერსონალური მწვრთნელი. ძალის ვარჯიშის მოყვარული.", location: "თბილისი", joinedDaysAgo: 410, topic: "fitness" },
    { username: "keti_yoga", name: "Keti Margvelashvili", bio: "იოგას ინსტრუქტორი. სხეული და გონება წონასწორობაში.", location: "ბათუმი", joinedDaysAgo: 360, topic: "fitness" },
    { username: "dr_natia", name: "Natia Chichinadze", bio: "ოჯახის ექიმი. ჯანმრთელობის განათლება ხალხისთვის.", location: "თბილისი", joinedDaysAgo: 700, verified: true, topic: "medicine" },
    { username: "giorgi_pharma", name: "Giorgi Kapanadze", bio: "ფარმაცევტი. წამლების უსაფრთხო გამოყენებაზე ვწერ.", location: "რუსთავი", joinedDaysAgo: 320, topic: "medicine" },
    { username: "maka_teacher", name: "Maka Lortkipanidze", bio: "დაწყებითი კლასების მასწავლებელი 20 წელია.", location: "თელავი", joinedDaysAgo: 800, topic: "education" },
    { username: "vaja_math", name: "Vaja Sturua", bio: "მათემატიკის მასწავლებელი. ოლიმპიადების მწვრთნელი.", location: "თბილისი", joinedDaysAgo: 500, topic: "education" },
    { username: "nika_cinema", name: "Nika Gelashvili", bio: "კინოკრიტიკოსი. ყოველკვირეული მიმოხილვები.", location: "თბილისი", joinedDaysAgo: 290, topic: "film" },
    { username: "elza_critic", name: "Elza Dolidze", bio: "კინომცოდნე. დამოუკიდებელი კინოს თაყვანისმცემელი.", location: "ქუთაისი", joinedDaysAgo: 240, topic: "film" },
    { username: "shota_garage", name: "Shota Managadze", bio: "ავტომექანიკოსი. ძველი მანქანების რესტავრაცია.", location: "ბათუმი", joinedDaysAgo: 460, topic: "automotive" },
    { username: "lasha_drift", name: "Lasha Beridze", bio: "საავტომობილო ჟურნალისტი. ტესტ-დრაივები.", location: "თბილისი", joinedDaysAgo: 210, topic: "automotive" },
    { username: "green_ge", name: "მწვანე საქართველო", bio: "გარემოსდაცვითი ორგანიზაცია. კლიმატი და მდგრადობა.", location: "საქართველო", joinedDaysAgo: 600, verified: true, topic: "environment" },
    { username: "tea_eco", name: "Tea Nadiradze", bio: "ეკოლოგი. მდგრადი ცხოვრების წესზე ვწერ.", location: "ბორჯომი", joinedDaysAgo: 270, topic: "environment" },
    { username: "avto_crypto", name: "Avtandil Jishkariani", bio: "Web3 დეველოპერი. Blockchain ანალიტიკა.", location: "თბილისი", joinedDaysAgo: 150, topic: "crypto" },
    { username: "nina_web3", name: "Nina Kavtaradze", bio: "კრიპტო ინვესტორი. DYOR ყოველთვის.", location: "თბილისი", joinedDaysAgo: 130, topic: "crypto" },
    { username: "juja_jokes", name: "Jujuna Meskhi", bio: "სტენდაპ კომიკოსი. ყოველკვირეული შოუები.", location: "თბილისი", joinedDaysAgo: 310, topic: "comedy" },
    { username: "goga_memes", name: "Goga Papidze", bio: "მემების შემქმნელი. ინტერნეტ-კულტურა.", location: "ქუთაისი", joinedDaysAgo: 160, topic: "comedy" },
    { username: "dato_coffee", name: "Dato Chkhaidze", bio: "ბარისტა-ჩემპიონი. ყავის სახლის მფლობელი.", location: "თბილისი", joinedDaysAgo: 380, topic: "food" },
    { username: "sopho_bakes", name: "Sopho Kiladze", bio: "საკონდიტრო შეფი. სახლში გამომცხვარი კვების ბლოგი.", location: "სიღნაღი", joinedDaysAgo: 230, topic: "food" },
    { username: "ana_melody", name: "Ana Chelidze", bio: "მომღერალი-სონგრაითერი. ახალი ალბომი გზაშია.", location: "თბილისი", joinedDaysAgo: 280, topic: "music" },
    { username: "davit_beats", name: "Davit Kacharava", bio: "მუსიკის პროდიუსერი. სტუდიაში მუდმივად.", location: "ბათუმი", joinedDaysAgo: 170, topic: "music" },
    { username: "lika_style", name: "Lika Abuladze", bio: "სტილისტი. პერსონალური გარდერობის კონსულტაცია.", location: "თბილისი", joinedDaysAgo: 240, topic: "fashion" },
    { username: "giga_tailor", name: "Giga Meladze", bio: "მოდის დიზაინერი. მდგრადი მოდის მხარდამჭერი.", location: "ქუთაისი", joinedDaysAgo: 310, topic: "fashion" },
    { username: "temo_backpack", name: "Temo Gogoladze", bio: "ბიუჯეტური მოგზაური. 40+ ქვეყანა ზურგჩანთით.", location: "თბილისი", joinedDaysAgo: 350, topic: "travel" },
    { username: "khatia_explores", name: "Khatia Bregvadze", bio: "მოგზაურობის ბლოგერი. ნელი მოგზაურობის მხარდამჭერი.", location: "ბათუმი", joinedDaysAgo: 200, topic: "travel" },
    { username: "irakli_ceo", name: "Irakli Chichua", bio: "დამფუძნებელი და CEO. მშენებლობასა და ზრდაზე ვწერ.", location: "თბილისი", joinedDaysAgo: 420, topic: "business" },
    { username: "mzia_marketing", name: "Mzia Kupradze", bio: "მარკეტინგის დირექტორი. ბრენდინგი და სტრატეგია.", location: "თბილისი", joinedDaysAgo: 290, topic: "business" },
    { username: "levan_poet", name: "Levan Asatiani", bio: "პოეტი. სამი კრებული გამოცემული.", location: "თელავი", joinedDaysAgo: 520, topic: "literature" },
    { username: "nino_novels", name: "Nino Tsereteli", bio: "მწერალი. მეოთხე რომანზე ვმუშაობ.", location: "თბილისი", joinedDaysAgo: 380, topic: "literature" },
    { username: "basket_ge", name: "საქართველოს კალათბურთი", bio: "ქართული კალათბურთის სიახლეები.", location: "", joinedDaysAgo: 700, verified: true, topic: "basketball" },
    { username: "zaza_hoops", name: "Zaza Dolaberidze", bio: "პროფესიონალი კალათბურთელი.", location: "ქუთაისი", joinedDaysAgo: 190, topic: "basketball" },
    { username: "eka_gallery", name: "Eka Chkheidze", bio: "გალერეის კურატორი. თანამედროვე ხელოვნება.", location: "თბილისი", joinedDaysAgo: 330, topic: "art" },
    { username: "tornike_sculptor", name: "Tornike Japaridze", bio: "მოქანდაკე. მასალასთან ექსპერიმენტები.", location: "ქუთაისი", joinedDaysAgo: 260, topic: "art" },
    { username: "space_ge", name: "ასტრონომიის კლუბი", bio: "ვარსკვლავთცნობა და კოსმოსური სიახლეები.", location: "საქართველო", joinedDaysAgo: 480, verified: true, topic: "astronomy" },
    { username: "luka_stars", name: "Luka Chanturia", bio: "მოყვარული ასტრონომი. ტელესკოპის მფლობელი.", location: "ბაკურიანი", joinedDaysAgo: 220, topic: "astronomy" },
    { username: "chess_master_ge", name: "Vakhtang Nozadze", bio: "ჭადრაკის მწვრთნელი. საერთაშორისო ოსტატი.", location: "თბილისი", joinedDaysAgo: 610, verified: true, topic: "chess" },
    { username: "sofo_chess", name: "Sofo Kandelaki", bio: "ჭადრაკის მოთამაშე. ონლაინ ტურნირების მონაწილე.", location: "რუსთავი", joinedDaysAgo: 150, topic: "chess" },
    { username: "vet_kote", name: "Kote Baramidze", bio: "ვეტერინარი. 15 წლის გამოცდილება.", location: "თბილისი", joinedDaysAgo: 650, verified: true, topic: "pets" },
    { username: "tiko_dogs", name: "Tiko Lomidze", bio: "ძაღლების მწვრთნელი. ქცევითი პრობლემების სპეციალისტი.", location: "ბათუმი", joinedDaysAgo: 210, topic: "pets" },

    // extra users added to broaden the community
    { username: "irakli_speedrun", name: "Irakli Kldiashvili", bio: "სპიდრანერი. მსოფლიო რეკორდების მონადირე.", location: "თბილისი", joinedDaysAgo: 140, topic: "gaming" },
    { username: "nato_crossfit", name: "Nato Iremadze", bio: "CrossFit მწვრთნელი. სიძლიერისა და გამძლეობის ფანატიკოსი.", location: "ბათუმი", joinedDaysAgo: 300, topic: "fitness" },
    { username: "levani_surgeon", name: "Levani Kiknavelidze", bio: "ქირურგი. მედიცინის განათლების პოპულარიზატორი.", location: "თბილისი", joinedDaysAgo: 560, verified: true, topic: "medicine" },
    { username: "eka_professor", name: "Eka Sanadze", bio: "უნივერსიტეტის პროფესორი. კომპიუტერული მეცნიერებები.", location: "თბილისი", joinedDaysAgo: 720, topic: "education" },
    { username: "beso_director", name: "Beso Khutsishvili", bio: "დამოუკიდებელი რეჟისორი. მოკლემეტრაჟიანი ფილმები.", location: "ქუთაისი", joinedDaysAgo: 250, topic: "film" },
    { username: "temuri_rally", name: "Temuri Bakhtadze", bio: "რალის მძღოლი. სიჩქარე სისხლში მაქვს.", location: "გორი", joinedDaysAgo: 190, topic: "automotive" },
    { username: "nana_recycle", name: "Nana Chachanidze", bio: "გადამუშავების აქტივისტი. ნარჩენების შემცირების მხარდამჭერი.", location: "ბათუმი", joinedDaysAgo: 400, topic: "environment" },
    { username: "giorgi_defi", name: "Giorgi Lomidze", bio: "DeFi ანალიტიკოსი. ონჩეინ მონაცემები ყოველდღე.", location: "თბილისი", joinedDaysAgo: 110, topic: "crypto" },
    { username: "ia_sketch", name: "Ia Kutateladze", bio: "სკეტჩ-კომედიის სცენარისტი. აბსურდის მოყვარული.", location: "თბილისი", joinedDaysAgo: 220, topic: "comedy" },
    { username: "vano_wine", name: "Vano Rcheulishvili", bio: "სომელიე. ქართული ღვინის ტრადიციები და თანამედროვეობა.", location: "სიღნაღი", joinedDaysAgo: 480, verified: true, topic: "food" },
    { username: "salome_choir", name: "Salome Kavtaradze", bio: "გუნდის დირიჟორი. ქართული პოლიფონიის მოამაგე.", location: "თბილისი", joinedDaysAgo: 540, topic: "music" },
    { username: "misha_shoes", name: "Misha Dundua", bio: "ფეხსაცმლის დიზაინერი. ხელნაკეთი წიგნის მოყვარული.", location: "თბილისი", joinedDaysAgo: 270, topic: "fashion" },
    { username: "nutsa_roadtrip", name: "Nutsa Berishvili", bio: "როუდ-ტრიპ ბლოგერი. საქართველოს მთები და გზები.", location: "მესტია", joinedDaysAgo: 180, topic: "travel" },
    { username: "data_analytics", name: "Data Kalandadze", bio: "სტარტაპ ანალიტიკოსი. ზრდის მეტრიკები და ექსპერიმენტები.", location: "თბილისი", joinedDaysAgo: 260, topic: "business" },
    { username: "gvantsa_editor", name: "Gvantsa Menabde", bio: "წიგნის რედაქტორი. ახალგაზრდა ავტორების აღმომჩენი.", location: "თბილისი", joinedDaysAgo: 390, topic: "literature" },
    { username: "lado_coach", name: "Lado Khizanishvili", bio: "კალათბურთის მწვრთნელი. ახალგაზრდული აკადემია.", location: "რუსთავი", joinedDaysAgo: 430, topic: "basketball" },
    { username: "mariam_mural", name: "Mariam Toidze", bio: "მურალისტი. ქუჩის ხელოვნება ქართული მოტივებით.", location: "თბილისი", joinedDaysAgo: 200, topic: "art" },
    { username: "beka_observatory", name: "Beka Tsereteli", bio: "ობსერვატორიის გიდი. ღამის ცის ტური ყოველთვის ღირს.", location: "აბასთუმანი", joinedDaysAgo: 310, topic: "astronomy" },
    { username: "ana_puzzles", name: "Ana Jorbenadze", bio: "ჭადრაკის ამოცანების შემდგენელი. ტაქტიკური თავსატეხები.", location: "თბილისი", joinedDaysAgo: 170, topic: "chess" },
    { username: "giorgi_aquarium", name: "Giorgi Metreveli", bio: "აკვარიუმისტი. მტკნარი წყლის ეგზოტიკური თევზები.", location: "ბათუმი", joinedDaysAgo: 240, topic: "pets" },

    // second wave — even more users, spread across the same topics
    { username: "dachi_retro", name: "Dachi Sordia", bio: "რეტრო-გეიმინგის კოლექციონერი. 80-90-იანების კონსოლები.", location: "ქუთაისი", joinedDaysAgo: 90, topic: "gaming" },
    { username: "mari_pilates", name: "Mari Khundadze", bio: "პილატესის ინსტრუქტორი. ჰოლისტიკური მიდგომა სხეულთან.", location: "თბილისი", joinedDaysAgo: 160, topic: "fitness" },
    { username: "dr_beso", name: "Beso Managadze", bio: "კარდიოლოგი. გულის ჯანმრთელობის ცნობიერების ამაღლება.", location: "თბილისი", joinedDaysAgo: 500, verified: true, topic: "medicine" },
    { username: "salome_tutor", name: "Salome Gorgadze", bio: "ინგლისურის რეპეტიტორი. ენების სწავლების მეთოდები.", location: "ბათუმი", joinedDaysAgo: 210, topic: "education" },
    { username: "tornike_critic", name: "Tornike Abesadze", bio: "კინოჟურნალისტი. ფესტივალების მიმომხილველი.", location: "თბილისი", joinedDaysAgo: 150, topic: "film" },
    { username: "nika_biker", name: "Nika Sturua", bio: "მოტოციკლისტი. გრძელი მარშრუტები და საკუთარი ხელით შეკეთება.", location: "ბათუმი", joinedDaysAgo: 130, topic: "automotive" },
    { username: "elo_zerowaste", name: "Elene Baiashvili", bio: "Zero-waste ცხოვრების წესის მხარდამჭერი.", location: "თბილისი", joinedDaysAgo: 220, topic: "environment" },
    { username: "sandro_nft", name: "Sandro Lortkipanidze", bio: "NFT შემქმნელი. ციფრული ხელოვნება და ბლოკჩეინი.", location: "თბილისი", joinedDaysAgo: 95, topic: "crypto" },
    { username: "tako_impro", name: "Tako Kiladze", bio: "იმპროვიზაციული თეატრის მსახიობი. სცენაზე ყველაფერი შეიძლება.", location: "თბილისი", joinedDaysAgo: 175, topic: "comedy" },
    { username: "beqa_grill", name: "Beqa Natroshvili", bio: "მწვადის ოსტატი. ცეცხლზე მომზადებული საუკეთესო კერძები.", location: "მცხეთა", joinedDaysAgo: 300, topic: "food" },
    { username: "nino_violin", name: "Nino Kobakhidze", bio: "ვიოლინისტი. კლასიკური და თანამედროვე რეპერტუარი.", location: "თბილისი", joinedDaysAgo: 450, verified: true, topic: "music" },
    { username: "levani_denim", name: "Levani Chachava", bio: "დენიმის ხელოსანი. ხელნაკეთი, გამძლე ტანსაცმელი.", location: "ქუთაისი", joinedDaysAgo: 190, topic: "fashion" },
    { username: "mariska_vans", name: "Mariska Todua", bio: "ვან-ლაივერი. სახლი ბორბლებზე და გზა უცნობისკენ.", location: "საქართველო", joinedDaysAgo: 140, topic: "travel" },
    { username: "goga_saas", name: "Goga Nemsadze", bio: "SaaS დამფუძნებელი. მეორე კომპანია, პირველი შეცდომების გარეშე.", location: "თბილისი", joinedDaysAgo: 330, topic: "business" },
    { username: "elza_poetry", name: "Elza Vashakidze", bio: "ახალგაზრდა პოეტესა. სოციალურ ქსელში წერის ახალი ტალღა.", location: "თელავი", joinedDaysAgo: 100, topic: "literature" },
  ];

  const TOPIC_POSTS: Record<Topic, string[]> = {
    gaming: [
      "გუშინდელი ტურნირი საუკეთესო იყო ამ სეზონში — ფინალი 3 საათს გაგრძელდა 🎮 #gaming",
      "ახალი პატჩი მთლიანად ცვლის მეტას, ყველა თავიდან უნდა ვისწავლოთ. #gaming",
      "სოლო რანკდში დღეს მეათე მოგება, ფორმაში ვარ 🔥",
      "ახალი თამაშის ტრეილერი გამოვიდა და გრაფიკა საოცარია, თარიღი ჯერ არ იციან.",
      "სტრიმზე დღეს ახალ სტრატეგიას ვცდი, მოდით ერთად ვნახოთ მუშაობს თუ არა.",
      "eSports-ის მაყურებელთა რაოდენობა წელს ისევ გაიზარდა — მალე ტრადიციულ სპორტს დაუტოლდება.",
      "საუკეთესო co-op თამაშები მეგობართან ერთად სათამაშოდ — ვინმეს რჩევა თუ აქვს?",
      "ძველი კონსოლი ჩავრთე ნოსტალგიით და მივხვდი რომ დღევანდელ თამაშებს ეს სიმარტივე აკლია.",
    ],
    fitness: [
      "დღეს ფეხების დღე იყო — ხვალ კიბეზე ასვლა პრობლემა იქნება 😅 #fitness",
      "3 თვის რეგულარული ვარჯიშის შემდეგ განსხვავება საკუთარ თავზეც კი შესამჩნევია.",
      "საუზმე ცილებით სავსე იყო და მთელი დღე ენერგია მქონდა — მართლა მუშაობს.",
      "ჯგუფური ვარჯიში სოლოზე გაცილებით მეტ მოტივაციას მაძლევს, ვისცდით?",
      "დასვენების დღეც ისეთივე მნიშვნელოვანია როგორც ვარჯიშის დღე — ამის დავიწყება ხშირად გვინდა.",
      "5კმ დღეს პირად რეკორდზე გავირბინე — ნელი პროგრესი მაინც პროგრესია.",
      "წყლის საკმარისად დალევა ყველაზე იაფი და უგულებელყოფილი ჯანმრთელობის რჩევაა.",
      "დამწყებთათვის: ტექნიკა უფრო მნიშვნელოვანია წონაზე, ეს არავინ გვითხრა თავიდან.",
    ],
    medicine: [
      "შემოდგომაზე გრიპის საწინააღმდეგო ვაქცინაცია განსაკუთრებით მნიშვნელოვანია რისკჯგუფებისთვის.",
      "ძილის ხარისხი პირდაპირ აისახება იმუნურ სისტემაზე — ხშირად უფრო მნიშვნელოვანია ვიდრე კვება.",
      "პაციენტებს ხშირად ვეუბნები: ინტერნეტი არ ანაცვლებს ექიმს, მაგრამ ინფორმირებული კითხვები მისასალმებელია.",
      "წყლის დეფიციტი ბევრი 'გაუგებარი' სისუსტის მიზეზია ზაფხულში.",
      "რეგულარული პროფილაქტიკური შემოწმება იაფია დღეს და ძვირი — თუ გამოტოვე.",
      "ანტიბიოტიკების არასწორად მიღება რეზისტენტობის მთავარი მიზეზთაგანია მსოფლიოში.",
      "ბავშვების ვაქცინაციის გრაფიკი არსებობს მიზეზის გამო — თანმიმდევრობა მნიშვნელოვანია.",
      "მენტალური ჯანმრთელობა ისეთივე რეალურია, როგორც ფიზიკური — ამის თქმა დღესაც სჭირდება ხოლმე.",
    ],
    education: [
      "მოსწავლეს რომ ერთხელაც კი თვალები გაუბრწყინდეს გაგებისას, ეს ღირს ყველა დაღლილ დღეს.",
      "დღეს კლასში საუკეთესო შეკითხვა მოსწავლემ დასვა და მე თვითონაც დავფიქრდი.",
      "შეფასების სისტემა ხშირად სწავლას აფასებს ნაკლებად, ვიდრე დამახსოვრებას.",
      "მშობლების ჩართულობა სახლში სწავლაზე გავლენას ისეთივე ძლიერად ახდენს, როგორც კლასში მუშაობა.",
      "ბავშვების ცნობისმოყვარეობა ჩვენი პასუხისმგებლობაა, არა შემაფერხებელი ფაქტორი.",
      "წიგნიერების კრიზისზე საუბარი გვჭირდება უფრო სერიოზულად, ვიდრე ახლა ვსაუბრობთ.",
      "საუკეთესო გაკვეთილები ის არის, სადაც მოსწავლეები მეტს საუბრობენ ვიდრე მასწავლებელი.",
      "მათემატიკის შიში ხშირად ერთი ცუდი გამოცდილებიდან იწყება ადრეულ ასაკში.",
    ],
    film: [
      "გუშინდელი ფილმი მოულოდნელად კარგი აღმოჩნდა — ტრეილერმა საერთოდ არ გამოხატა პოტენციალი.",
      "კინემატოგრაფია ბოლო ათწლეულში საოცრად გაუმჯობესდა, სცენარები კი ხშირად ჩამორჩება.",
      "ძველი ფილმების თავიდან ყურება ხშირად უფრო საინტერესოა, ვიდრე პირველად ნახვისას.",
      "საუკეთესო ფინალი ბოლო წლების ფილმებში — spoiler-ის გარეშე, უბრალოდ ნახეთ.",
      "დამოუკიდებელი კინო ხშირად უფრო გამბედავია სცენარულად, ვიდრე დიდი სტუდიების პროდუქცია.",
      "საუნდტრეკი ზოგჯერ ფილმზე მეტ შთაბეჭდილებას ტოვებს — დღეს სწორედ ასეთი შემთხვევა იყო.",
      "კინოთეატრში ყურება სახლში ყურებას ჯერ კიდევ ვერაფერი ჩაანაცვლებს ჩემთვის.",
      "საუკეთესო რეჟისორები ის არიან, ვინც იცის როდის არაფერი თქვას კადრში.",
    ],
    automotive: [
      "ძველი ავტომობილის რესტავრაცია ბევრად მეტ დროს მოითხოვს ვიდრე ვფიქრობდი, მაგრამ ღირს.",
      "ელექტრომობილების ბაზარი უფრო სწრაფად იზრდება ვიდრე ინფრასტრუქტურა მათთვის.",
      "მექანიკოსთან ნდობა წლების განმავლობაში შენდება — არავის ვურჩევდი ხშირად შეცვლას.",
      "საუკეთესო როუდ-ტრიპი ის არის, სადაც მარშრუტს გეგმავ, მაგრამ გეგმისგან გადახვევასაც ვერიდები.",
      "ზამთრის საბურავების დროულად გამოცვლა ერთ-ერთი ყველაზე იაფი უსაფრთხოების ინვესტიციაა.",
      "ძველი მანქანის ხმა ახალთან შედარებით სულ სხვა ემოციას იძლევა.",
      "საწვავის ეკონომია მოძველებული საზრუნავია, თუ ჰიბრიდზე ჯერ არ გადახვედი.",
      "გზაზე თავაზიანობა უფრო მნიშვნელოვანია ვიდრე მანქანის სიმძლავრე.",
    ],
    environment: [
      "ერთჯერადი პლასტმასის შემცირება პატარა ნაბიჯია, მაგრამ ერთად დიდ განსხვავებას ქმნის. #ეკოლოგია",
      "ტყის აღდგენის პროექტები საქართველოში ნელა, მაგრამ სტაბილურად ვითარდება.",
      "წყლის რესურსების მდგრადი მართვა კლიმატის ცვლილებასთან ერთად სულ უფრო აქტუალურია.",
      "ადგილობრივი პროდუქტის მოხმარება ტრანსპორტირების ნახშირბადის კვალს მნიშვნელოვნად ამცირებს.",
      "მზის ენერგიის ფასი ბოლო ათწლეულში საოცრად დაეცა — დროა სერიოზულად განვიხილოთ.",
      "გადამუშავების სისტემა მუშაობს მხოლოდ მაშინ, როცა ინფრასტრუქტურაც არსებობს — ეს ჯერ ნაკლებია.",
      "ბიომრავალფეროვნების დაცვა ისეთივე გადაუდებელია, როგორც კლიმატის ცვლილებასთან ბრძოლა.",
      "პატარა საკუთარი ბაღიც კი დადებითად მოქმედებს ადგილობრივ ეკოსისტემაზე.",
    ],
    crypto: [
      "ბაზრის მერყეობა ისევ დღის წესრიგშია — გრძელვადიანი პერსპექტივა მთავარია, არა დღიური ცვლილება. #crypto",
      "Blockchain-ის რეალური გამოყენება ფინანსების მიღმაც არსებობს, ამაზე ნაკლებად საუბრობენ.",
      "თვითდაცვა (self-custody) crypto-ში პასუხისმგებლობაცაა და თავისუფლებაც ერთდროულად.",
      "რეგულაციები ნელა მოდის, მაგრამ ინდუსტრიის მომწიფებისთვის საჭიროა.",
      "ახალი პროექტების უმეტესობა ორ წელიწადში აღარ არსებობს — DYOR ყოველთვის აქტუალურია.",
      "Gas fee-ების პრობლემა ბოლო წლებში მნიშვნელოვნად გაუმჯობესდა ახალი ტექნოლოგიებით.",
      "საინვესტიციო გადაწყვეტილება ემოციაზე კი არა, კვლევაზე უნდა იყოს დაფუძნებული.",
      "web3-ის განათლება ჯერ კიდევ ბევრს აკლია ფართო აუდიტორიისთვის.",
    ],
    comedy: [
      "დღეს ისეთი დღე იყო, სტენდაპის მასალა თავისით იწერებოდა 😂",
      "საუკეთესო იუმორი ის არის, რომელიც საკუთარ თავზეც კი გეცინება.",
      "მეგობრებთან ჩატი ხანდახან სტენდაპ-სცენაზე მეტად სასაცილოა.",
      "ცუდი დღეც კი აუტანელი აღარაა, თუ ვინმეს გაცინება მოახერხე.",
      "ირონია საუკეთესო ინსტრუმენტია სერიოზული თემების უფრო მსუბუქად წარმოსაჩენად.",
      "დღევანდელი შოუ საოცარი იყო — დარბაზი ბოლომდე იცინოდა.",
      "მემები ხანდახან საუკეთესოდ აჯამებენ კვირის ამბებს, უფრო ვიდრე ახალი ამბები.",
      "ხუმრობა რომ ბოლომდე ვერ გავიგე, მაგრამ ყველა იცინოდა — ესეც ერთგვარი გამოცდილებაა.",
    ],
    food: [
      "დღეს ახალი ყავის ხარშვის მეთოდი ვცადე — გემო სრულიად განსხვავებული გამოვიდა ☕",
      "სახლში გამომცხვარი პური არაფერს ჩამოუვარდება საუკეთესო საცხობს, დროც სჭირდება.",
      "ადგილობრივი ბაზრიდან ახალი ბოსტნეული სულ სხვა გემოს აძლევს ჩვეულებრივ კერძებსაც კი.",
      "ყავის მარცვლის დაფქვის ხარისხი გემოზე უფრო მეტად მოქმედებს, ვიდრე ბევრი ფიქრობს.",
      "ძველი ოჯახური რეცეპტის აღდგენა დღევანდელი დღის საუკეთესო პროექტი იყო.",
      "საუზმე, რომელსაც დრო დაუთმეთ, დღის დანარჩენ ნაწილსაც სხვანაირად აყალიბებს.",
      "ადგილობრივი კაფეების მხარდაჭერა საკუთარი გემოვნებისთვისაც სასარგებლოა და თემისთვისაც.",
      "სუფრაზე მარტივი, მაგრამ ხარისხიანი ინგრედიენტები ყოველთვის იმარჯვებს რთულ რეცეპტებზე.",
    ],
    music: [
      "ახალი ალბომი დღეს გამოვუშვი — თვეების მუშაობის შედეგი ერთ დღეს ისმის 🎶",
      "კონცერტის შემდეგ ხმა არ დამრჩა, მაგრამ ღირდა — დარბაზი საოცარი იყო.",
      "აკუსტიკური ვერსია ხშირად ორიგინალზე მეტად მომწონს, დღეს ეს ხელახლა დავრწმუნდი.",
      "სტუდიაში ახალი ინსტრუმენტი ვცადე და საერთოდ ახალი ხმა გამომივიდა.",
      "ცოცხალი შესრულება ჩანაწერს ვერასდროს ჩაანაცვლებს — ენერგია სულ სხვაა.",
      "თანამშრომლობა სხვა მუსიკოსთან ყოველთვის მოულოდნელ მიმართულებას გვაძლევს.",
      "პირველი სიმღერა, რომელიც დავწერე, დღემდე ყველაზე გულწრფელი მგონია.",
      "მუსიკალური განათლება ბავშვობაში მთელი ცხოვრების პერსპექტივას ცვლის.",
    ],
    fashion: [
      "სეზონური გარდერობის განახლება არ ნიშნავს ყველაფრის ახლით შეცვლას — ბაზისს ვამატებ მხოლოდ.",
      "ვინტაჟური ნივთები ხშირად უკეთესი ხარისხისაა, ვიდრე დღევანდელი მასობრივი წარმოება.",
      "სტილი პიროვნების გამოხატვაა, არა მოდის ბრმად მიყოლა.",
      "დღეს კლიენტთან ვმუშაობდი და საბოლოო შედეგმა მეც კი გამაოცა.",
      "ხარისხიანი ერთი ნივთი ღირს ათ იაფფასიან ალტერნატივაზე მეტად.",
      "ადგილობრივი დიზაინერების მხარდაჭერა ინდუსტრიის განვითარებისთვის მნიშვნელოვანია.",
      "ფერების შერჩევა გარდერობში პიროვნების განწყობასაც კი ცვლის.",
      "მდგრადი მოდა აღარაა ტრენდი, ეს აუცილებლობაა.",
    ],
    travel: [
      "ბიუჯეტური მოგზაურობა ხშირად უფრო ავთენტურ გამოცდილებას იძლევა, ვიდრე ძვირადღირებული ტურები.",
      "ადგილობრივებთან საუბარი ნებისმიერ გიდზე მეტს გასწავლით ქვეყანაზე.",
      "ერთი ჩანთით მოგზაურობა თავისუფლების უცნაური განცდაა.",
      "საუკეთესო მარშრუტები ხშირად გეგმის მიღმა, შემთხვევით აღმოჩენილი ადგილებია.",
      "ღამის მატარებელი ჯერ კიდევ ჩემი საყვარელი გზა ევროპაში გადასაადგილებლად.",
      "ადგილობრივი სამზარეულოს ცდა ნებისმიერ ქვეყანაში მოგზაურობის აუცილებელი ნაწილია.",
      "ბოლო მოგზაურობამ დამარწმუნა — გეგმა ნაკლებად, ისიამოვნე მეტად.",
      "მოგზაურობის ყველაზე ძვირფასი სუვენირი ხშირად მოგონებაა, არა ნივთი.",
    ],
    business: [
      "დღეს ჩვენი გუნდი 20 ადამიანს მიაღწია — თითოეული მათგანი მნიშვნელოვანია.",
      "წარუმატებლობა გზაზეა, არა დასასრული — ეს ყოველ ჯერზე თავიდან უნდა ვისწავლო.",
      "მომხმარებლის უკუკავშირი ყველაზე ღირებული მონაცემია, რაც სტარტაპს შეიძლება ჰქონდეს.",
      "ინვესტორებთან პრეზენტაცია სტრესულია, მაგრამ ყოველი ცდა გაკვეთილია.",
      "გუნდის კულტურა პროდუქტზე ადრეც კი უნდა აშენდეს.",
      "მასშტაბირება ადრეულ ეტაპზე ხშირად შეცდომაა — ჯერ საფუძველი უნდა მოვამზადოთ.",
      "კონკურენტების ნაცვლად მომხმარებელზე ფოკუსირება ყოველთვის სწორი გზაა.",
      "დღევანდელი შეხვედრა გუნდთან სამომავლო სტრატეგიაზე პროდუქტიული იყო.",
    ],
    literature: [
      "ლექსი, რომელიც დღეს დავწერე, სამი თვის დაწერას ვერ ვახერხებდი.",
      "კარგი პროზა ისეთივე რიტმს მოითხოვს, როგორც პოეზია — ამას ხშირად ვივიწყებთ.",
      "პირველი დრაფტი ყოველთვის ცუდია — ეს დამწერლობის ნაწილია, არა შეცდომა.",
      "ძველი ქართული პოეზიის ხელახლა კითხვა ყოველთვის ახალ საზრისებს აღმოაჩენს.",
      "რომანზე მუშაობა ხანდახან მარათონს ჰგავს, არა სპრინტს.",
      "პერსონაჟი, რომელიც თავად გაგაკვირვებს თავისი გადაწყვეტილებით — ეს კარგი ნიშანია.",
      "მკითხველის წერილი დღეს მივიღე და მთელი დღე ღიმილით გავატარე.",
      "წერის ბლოკი რეალურია, მაგრამ გამოსავალიც ყოველთვის არსებობს.",
    ],
    basketball: [
      "გუშინდელი მატჩი ბოლო წამებამდე გაურკვეველი იყო — ზუსტად ასეთი სპორტი მიყვარს.",
      "ახალგაზრდა თამაშელების განვითარება ლიგისთვის უმნიშვნელოვანესია გრძელვადიან პერსპექტივაში.",
      "დამცავი თამაშა ხშირად შეუმჩნეველია, მაგრამ თამაშებს სწორედ ის წყვეტს.",
      "საწვრთნელი პროცესი მატჩზე მეტს ამბობს მოთამაშის დისციპლინაზე.",
      "გუნდური ქიმია სტატისტიკაში არასდროს ჩანს, მაგრამ თამაშს განსაზღვრავს.",
      "სამწერტილიანი სროლის სტატისტიკა ბოლო წლებში საოცრად შეიცვალა.",
      "ვარჯიშზე დღეს ახალი კომბინაცია ვცადეთ — მატჩზე ვნახავთ მუშაობს თუ არა.",
      "ახალგაზრდული ლიგის მატჩი დღეს ვნახე — ნიჭი უსაზღვროა ამ თაობაში.",
    ],
    art: [
      "გამოფენის მოწყობა თვეების მუშაობას მოითხოვს, მაგრამ გახსნის დღე ყოველთვის ღირს.",
      "ახალგაზრდა მხატვრების მხარდაჭერა გალერეის მთავარი მისიაა ჩემთვის.",
      "სკულპტურა სივრცესთან დიალოგია — ეს არასდროს მარტივი პროცესი არაა.",
      "ხელოვნება ინტერპრეტაციისთვისაა, არა ერთადერთი სწორი პასუხისთვის.",
      "მასალასთან მუშაობა ხანდახან იდეაზე მეტს გვასწავლის პროცესში.",
      "თანამედროვე ხელოვნება ბევრს პროვოცირებას უკეთებს — ეს კარგია, არა ცუდი.",
      "გამოფენაზე ვინმეს ცრემლები რომ დავინახე ნამუშევრის წინ, ეს დღემდე მახსოვს.",
      "ხელოვნების განათლება სკოლებში საკმარისად სერიოზულად არაა აღქმული.",
    ],
    astronomy: [
      "დღეს ღამით ვარსკვლავებით სავსე ცას ვუყურებდი და ისევ პატარა ვიგრძენი თავი — კარგი გრძნობით.",
      "ახალი ტელესკოპის სურათები საოცარი დეტალებით გამოირჩევა.",
      "მთვარის დაბნელება ყოველთვის თავშეკავებას მოითხოვს — ლოდინი ღირს.",
      "კოსმოსური კვლევა ჩვენს ყოველდღიურ ტექნოლოგიებზეც პირდაპირ გავლენას ახდენს.",
      "ვარსკვლავური ცის დაბინძურება ქალაქებში სამწუხაროდ სულ უფრო მატულობს.",
      "სხვა პლანეტების აღმოჩენა ცხოვრების შესაძლებლობაზე კითხვას კვლავ ღიად ტოვებს.",
      "ბავშვებისთვის ვარსკვლავთცნობა საუკეთესო გზაა მეცნიერებისადმი ინტერესის გასაღვივებლად.",
      "დღეს მეტეორთა წვიმა ვნახე — ასეთი ღამეები იშვიათია და დასამახსოვრებელი.",
    ],
    chess: [
      "დღევანდელი პარტია სამ საათს გაგრძელდა — ბოლო სვლამდე ორივემ ვიბრძოლეთ.",
      "ჭადრაკი მოთმინებას ისეთივე ხარისხით გასწავლის, როგორც ტაქტიკას.",
      "დებიუტების სწავლა მნიშვნელოვანია, მაგრამ ენდშპილი თამაშს წყვეტს ხშირად.",
      "ახალგაზრდა მოთამაშეებთან მუშაობა ყოველთვის ახალ პერსპექტივას მაძლევს თამაშზე.",
      "კომპიუტერული ანალიზი თამაშს შეცვალა, მაგრამ ინტუიციას ჯერ ვერაფერი ჩაანაცვლებს.",
      "დამარცხება კარგად გაანალიზებული უფრო ღირებულია, ვიდრე შემთხვევითი მოგება.",
      "ტურნირის ატმოსფერო ონლაინ თამაშს ვერასდროს ჩაენაცვლება.",
      "ჭადრაკის სწავლება სკოლებში ლოგიკურ აზროვნებას მნიშვნელოვნად აძლიერებს.",
    ],
    pets: [
      "დღეს კლინიკაში საოცარი შემთხვევა მქონდა — პატარა ძაღლი სრულად გამოჯანმრთელდა.",
      "ცხოველების ადრეული სოციალიზაცია მთელი ცხოვრების ქცევას განსაზღვრავს.",
      "სტერილიზაცია პასუხისმგებლიანი პატრონობის მნიშვნელოვანი ნაწილია.",
      "ძაღლის წვრთნაში მოთმინება შედეგზე მეტად მნიშვნელოვანია.",
      "შინაური ცხოველის აყვანამდე ცხოვრების წესის შეფასება აუცილებელია.",
      "კატები ძაღლებზე ნაკლებად დამოკიდებულები არიან, მაგრამ ესეც მოვლას მოითხოვს.",
      "ვეტერინარული პროფილაქტიკური შემოწმება წელიწადში ერთხელ მინიმუმ საჭიროა.",
      "ცხოველთან კავშირი ხშირად თერაპიულ ეფექტსაც კი იძლევა პატრონისთვის.",
    ],
  };

  const userIds: Record<string, string> = {};
  const passwordHash = bcrypt.hashSync("Password123", 10);

  for (const u of originalUsers) {
    const id = randomUUID();
    userIds[u.username] = id;
    insertUser.run({
      id, username: u.username, name: u.name, email: `${u.username}@example.com`,
      password_hash: passwordHash, bio: u.bio, location: u.location,
      verified: u.verified ? 1 : 0, created_at: daysAgo(u.joinedDaysAgo),
    });
  }
  for (const u of newUsers) {
    const id = randomUUID();
    userIds[u.username] = id;
    insertUser.run({
      id, username: u.username, name: u.name, email: `${u.username}@example.com`,
      password_hash: passwordHash, bio: u.bio, location: u.location,
      verified: u.verified ? 1 : 0, created_at: daysAgo(u.joinedDaysAgo),
    });
  }

  const insertTweet = db.prepare(
    `INSERT INTO tweets (id, user_id, content, image_url, parent_id, quote_of_id, view_count, created_at)
     VALUES (@id, @user_id, @content, @image_url, @parent_id, @quote_of_id, @view_count, @created_at)`
  );
  const insertFollow = db.prepare(`INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)`);
  const insertLike = db.prepare(`INSERT OR IGNORE INTO likes (user_id, tweet_id, created_at) VALUES (?, ?, ?)`);
  const insertRetweet = db.prepare(`INSERT OR IGNORE INTO retweets (user_id, tweet_id, created_at) VALUES (?, ?, ?)`);
  const insertMessage = db.prepare(`INSERT INTO messages (id, sender_id, recipient_id, content, is_read, created_at) VALUES (?, ?, ?, ?, 1, ?)`);
  const insertPoll = db.prepare(`INSERT INTO polls (tweet_id, options, created_at) VALUES (?, ?, ?)`);
  const insertPollVote = db.prepare(`INSERT OR IGNORE INTO poll_votes (tweet_id, user_id, option_index, created_at) VALUES (?, ?, ?, ?)`);
  const updateTweetImage = db.prepare(`UPDATE tweets SET image_url = ? WHERE id = ?`);

  function addTweet(user: string, content: string, opts: { replyTo?: string; quoteOf?: string; daysAgo: number; imageUrl?: string }) {
    const id = randomUUID();
    insertTweet.run({
      id,
      user_id: userIds[user],
      content,
      image_url: opts.imageUrl ?? "",
      parent_id: opts.replyTo ?? null,
      quote_of_id: opts.quoteOf ?? null,
      view_count: Math.floor(Math.random() * 900) + 20,
      created_at: daysAgo(opts.daysAgo),
    });
    return id;
  }

  const tweetIds: string[] = [];
  const T: Record<string, string> = {}; // named handles for posts we need to reference later

  // --- original hand-written posts (kept exactly as before) ---
  const originalPosts: { key: string; user: string; content: string; daysAgo: number }[] = [
    { key: "p0", user: "elene_dev", content: "დღეს საბოლოოდ გავასწორე ის React-ის ბაგი, რომელიც სამი დღეა მაწუხებდა 🎉 #frontend", daysAgo: 6 },
    { key: "p1", user: "giorgi_ux", content: "კარგი დიზაინი შეუმჩნეველია — ცუდი დიზაინი ყველგან ჩანს. #dizaini", daysAgo: 6 },
    { key: "p2", user: "newsbot", content: "ახალი ბრაუზერის განახლება აჩქარებს გვერდების ჩატვირთვას საშუალოდ 15%-ით. #ტექნოლოგია", daysAgo: 5 },
    { key: "p3", user: "chiko", content: "ვაშენებ პროექტს Next.js-ზე და Tailwind-ზე — ძალიან სასიამოვნო კომბინაციაა. #nextjs #webdev", daysAgo: 5 },
    { key: "p4", user: "elene_dev", content: "TypeScript-ის გარეშე დაბრუნება უკვე აღარ შემიძლია.", daysAgo: 5 },
    { key: "p5", user: "giorgi_ux", content: "მომხმარებლის ინტერფეისში სივრცე ისეთივე მნიშვნელოვანია, როგორც შემავსებელი ელემენტები. #dizaini", daysAgo: 4 },
    { key: "p6", user: "nini_photo", content: "დილის ნისლი მთებში — ერთი იმ დილეთაგან, როცა კამერას წამითაც არ ტოვებ. #photography", daysAgo: 4 },
    { key: "p7", user: "luka_music", content: "სტუდიაში ვარ მთელი ღამე. ახალი სინგლი კვირას გამოდის 🎧🔥", daysAgo: 4 },
    { key: "p8", user: "mariam_chef", content: "ხაჭაპური კარტოფილით — არასტანდარტული, მაგრამ საოცრად გემრიელი კომბინაცია. რეცეპტი მალე.", daysAgo: 3 },
    { key: "p9", user: "davit_startup", content: "დღეს ჩვენი პირველი 1000 მომხმარებელი მივიღეთ. მადლობა ყველას ვინც გვერდში დაგვიდგა 🙏", daysAgo: 3 },
    { key: "p10", user: "ana_travels", content: "სვანეთი კიდევ ერთხელ დაამტკიცა — საქართველოში მოგზაურობა არაფრით ჩამოუვარდება ევროპულ მარშრუტებს. #travel", daysAgo: 3 },
    { key: "p11", user: "beka_gamer", content: "დღეს საღამოს 21:00-ზე სტრიმი — ძველი RPG-ების მარათონი. მოდით ერთად ვნოსტალგიოთ.", daysAgo: 3 },
    { key: "p12", user: "tamar_law", content: "მონაცემთა დაცვის კანონმდებლობა სულ უფრო აქტუალური ხდება სტარტაპებისთვის. ღირს ადრეულ ეტაპზევე დაფიქრება.", daysAgo: 2 },
    { key: "p13", user: "sport_ge", content: "ეროვნული ნაკრები ხვალინდელი მატჩისთვის მზადებას ასრულებს. შემადგენლობა უცვლელია. #ფეხბურთი", daysAgo: 2 },
    { key: "p14", user: "irakli_arch", content: "ძველი თბილისის ბალკონები ერთ-ერთი ყველაზე დაუფასებელი არქიტექტურული საგანძურია მსოფლიოში.", daysAgo: 2 },
    { key: "p15", user: "salome_art", content: "ახალი ილუსტრაცია დავამთავრე — ციფრული აკვარელის ეფექტი კარგად გამომივიდა ვფიქრობ 🎨", daysAgo: 2 },
    { key: "p16", user: "zura_finance", content: "ბაზრის მოკლევადიანი რყევები ხშირად არაფერს ნიშნავს გრძელვადიანი სტრატეგიისთვის. მოთმინება მთავარია.", daysAgo: 2 },
    { key: "p17", user: "nutsa_science", content: "მარტივად: რატომ ვბანავთ და რატომ ხმაურობს ჭექა-ქუხილი გვიან — ბავშვებისთვის მეცნიერების ძაფი მალე გაგრძელდება.", daysAgo: 1 },
    { key: "p18", user: "koba_football", content: "თაობის საუკეთესო ნახევარმცველი ვინ არის თქვენი აზრით? კომენტარებში დავხარჯოთ საღამო 😄", daysAgo: 1 },
    { key: "p19", user: "mari_books", content: "წლის საუკეთესო წიგნი, რაც წავიკითხე — და არავინ მკითხავს, მაგრამ მაინც გეტყვით 📚", daysAgo: 1 },
    { key: "p20", user: "chiko", content: "საღამოს კოდის რევიუ და შემდეგ დასვენება. კვირას ასე უნდა დაამთავრო. #devlife", daysAgo: 1 },
    { key: "p21", user: "elene_dev", content: "CSS Grid-მა ჩემი ცხოვრება შეცვალა. სერიოზულად ვამბობ.", daysAgo: 1 },
    { key: "p22", user: "giorgi_ux", content: "ყოველთვის დატესტეთ დიზაინი რეალურ მონაცემებზე, არა placeholder ტექსტზე.", daysAgo: 1 },
    { key: "p23", user: "newsbot", content: "ხელოვნური ინტელექტის ახალი მოდელი აჩვენებს გაუმჯობესებულ შედეგებს კოდირების ბენჩმარკებზე. #AI", daysAgo: 1 },
    { key: "p24", user: "davit_startup", content: "ინვესტორებთან შეხვედრები გრძელდება. სტრესულია, მაგრამ ვსწავლობ ბევრს.", daysAgo: 0 },
    { key: "p25", user: "nini_photo", content: "შავი ზღვის მზის ჩასვლა ბათუმიდან — ფილტრების გარეშე, ბუნებრივი ფერები. #ბათუმი", daysAgo: 0 },
    { key: "p26", user: "beka_gamer", content: "საბოლოოდ დავამარცხე ის ბოსი, რომელზეც კვირაა ვიშრები 😤🎮", daysAgo: 0 },
  ];
  for (const p of originalPosts) {
    const id = addTweet(p.user, p.content, { daysAgo: p.daysAgo });
    tweetIds.push(id);
    T[p.key] = id;
  }

  const originalReplies: { user: string; content: string; replyTo: string; daysAgo: number }[] = [
    { user: "chiko", content: "ზუსტად ეგრე! CSS Grid-ის შემდეგ flexbox-ზე დაბრუნება უცნაურია.", replyTo: "p21", daysAgo: 1 },
    { user: "giorgi_ux", content: "მადლობა, კარგი მუშაობაა! 🎉", replyTo: "p0", daysAgo: 5 },
    { user: "davit_startup", content: "გილოცავ! 1000 მომხმარებელი დიდი ეტაპია.", replyTo: "p9", daysAgo: 3 },
    { user: "ana_travels", content: "სვანეთი ჩემი საყვარელი ადგილია საქართველოში, ბედნიერი ხარ რომ იქ ხარ.", replyTo: "p6", daysAgo: 4 },
    { user: "elene_dev", content: "ჯავშანი ხომ არ დარჩა სტრიმზე ადგილი? 😄", replyTo: "p11", daysAgo: 3 },
    { user: "tamar_law", content: "სრულიად ვეთანხმები, ეს თემა ხშირად იგნორირებულია სტარტაპებში.", replyTo: "p12", daysAgo: 2 },
  ];
  for (const r of originalReplies) tweetIds.push(addTweet(r.user, r.content, { replyTo: T[r.replyTo], daysAgo: r.daysAgo }));

  const originalQuotes: { user: string; content: string; quoteOf: string; daysAgo: number }[] = [
    { user: "koba_football", content: "სპორტული სიახლეები ყოველთვის ღირს დაფოლოუება 👇", quoteOf: "p13", daysAgo: 2 },
    { user: "nutsa_science", content: "საინტერესო კუთხით არის დანახული, დავამატებდი კიდევ ერთ ფაქტორს კომენტარებში.", quoteOf: "p3", daysAgo: 4 },
  ];
  for (const q of originalQuotes) tweetIds.push(addTweet(q.user, q.content, { quoteOf: T[q.quoteOf], daysAgo: q.daysAgo }));

  // --- new topic-generated posts, spread over the last 10 days ---
  let dayCursor = 10;
  for (const u of newUsers) {
    const bank = TOPIC_POSTS[u.topic];
    const topicPeers = newUsers.filter((x) => x.topic === u.topic);
    const indexInTopic = topicPeers.indexOf(u);
    // round-robin the topic's post bank across however many users share it,
    // so extra users added to an existing topic don't just repeat earlier posts
    const slice = bank.filter((_, i) => i % topicPeers.length === indexInTopic % topicPeers.length);
    for (const content of slice) {
      dayCursor = (dayCursor + 1) % 11;
      const id = addTweet(u.username, content, { daysAgo: dayCursor });
      tweetIds.push(id);
      if (!T[`${u.username}_first`]) T[`${u.username}_first`] = id;
    }
  }

  // a few replies and quotes threaded through the new content
  const crossReplies: { user: string; content: string; replyToUser: string; daysAgo: number }[] = [
    { user: "mariami_streams", content: "100% ვეთანხმები, ეს პატჩი ყველაფერს შლის და თავიდან იწყებ.", replyToUser: "sandro_esports_first", daysAgo: 3 },
    { user: "keti_yoga", content: "დასვენების დღეებზე მეც ამას ვამბობ მუდმივად კლიენტებს.", replyToUser: "levan_fitness_first", daysAgo: 2 },
    { user: "giorgi_pharma", content: "ზუსტად, ეს ბევრჯერ არ ითქმის საკმარისად ხმამაღლა.", replyToUser: "dr_natia_first", daysAgo: 4 },
    { user: "vaja_math", content: "მათემატიკის შიშზე მთელი კვლევა შეიძლება დაიწეროს — ნამდვილად ადრეულ ასაკში იწყება.", replyToUser: "maka_teacher_first", daysAgo: 5 },
    { user: "elza_critic", content: "საუნდტრეკის მნიშვნელობას ხშირად ვუყურებთ, სამწუხაროდ.", replyToUser: "nika_cinema_first", daysAgo: 3 },
    { user: "lasha_drift", content: "ტესტ-დრაივებზეც ხშირად ვხედავ ამ განსხვავებას ძველსა და ახალს შორის.", replyToUser: "shota_garage_first", daysAgo: 2 },
    { user: "tea_eco", content: "მცირე ნაბიჯების ჯამური ეფექტი ხშირად გვავიწყდება, კარგი შეხსენებაა.", replyToUser: "green_ge_first", daysAgo: 6 },
    { user: "nina_web3", content: "DYOR-ის მნიშვნელობა ყოველთვის დგას, განსაკუთრებით ბაზრის ეიფორიისას.", replyToUser: "avto_crypto_first", daysAgo: 3 },
    { user: "goga_memes", content: "მემები ნამდვილად უფრო სწრაფად ვრცელდება ვიდრე ახალი ამბები 😂", replyToUser: "juja_jokes_first", daysAgo: 2 },
    { user: "sopho_bakes", content: "ოჯახური რეცეპტების აღდგენა ჩემთვისაც ერთ-ერთი საყვარელი პროექტია.", replyToUser: "dato_coffee_first", daysAgo: 4 },
    { user: "davit_beats", content: "აკუსტიკური ვერსიები ხშირად სტუდიურ ჩანაწერზე მეტად მაგრძნობინებს ემოციას.", replyToUser: "ana_melody_first", daysAgo: 2 },
    { user: "giga_tailor", content: "ვინტაჟის ხარისხზე ვერაფერი შედის, სრულიად ვეთანხმები.", replyToUser: "lika_style_first", daysAgo: 3 },
    { user: "khatia_explores", content: "ერთი ჩანთით მოგზაურობა ჩემთვისაც ცხოვრების წესად იქცა.", replyToUser: "temo_backpack_first", daysAgo: 2 },
    { user: "mzia_marketing", content: "გუნდის კულტურა მართლაც ადრეულ ეტაპზევე წყდება, არა მოგვიანებით.", replyToUser: "irakli_ceo_first", daysAgo: 4 },
    { user: "nino_novels", content: "პირველი დრაფტის სისუსტეზე ყოველთვის ვეუბნები სტუდენტებს ამას.", replyToUser: "levan_poet_first", daysAgo: 3 },
    { user: "zaza_hoops", content: "დამცავი თამაშა მართლა შეუმჩნეველია, მაგრამ მწვრთნელები ამას პირველად ვხედავთ.", replyToUser: "basket_ge_first", daysAgo: 2 },
    { user: "tornike_sculptor", content: "ინტერპრეტაციის თავისუფლება ხელოვნების არსია, ზუსტად.", replyToUser: "eka_gallery_first", daysAgo: 5 },
    { user: "luka_stars", content: "ვარსკვლავური ცის დაბინძურება ჩემთვისაც სულ უფრო შემაწუხებელი ხდება.", replyToUser: "space_ge_first", daysAgo: 3 },
    { user: "sofo_chess", content: "ენდშპილის ცოდნა მართლა ხშირად წყვეტს პარტიას, დებიუტზე მეტად.", replyToUser: "chess_master_ge_first", daysAgo: 2 },
    { user: "tiko_dogs", content: "ადრეული სოციალიზაციის მნიშვნელობას პატრონები ხშირად ვერ აცნობიერებენ.", replyToUser: "vet_kote_first", daysAgo: 4 },
  ];
  for (const r of crossReplies) tweetIds.push(addTweet(r.user, r.content, { replyTo: T[r.replyToUser], daysAgo: r.daysAgo }));

  const crossQuotes: { user: string; content: string; quoteOfUser: string; daysAgo: number }[] = [
    { user: "sandro_esports", content: "სასარგებლო შეხედულებაა, გავუზიარებ გუნდსაც.", quoteOfUser: "mariami_streams_first", daysAgo: 2 },
    { user: "dr_natia", content: "ეს არის ზუსტად ის რასაც პაციენტებს ვეუბნები.", quoteOfUser: "giorgi_pharma_first", daysAgo: 3 },
    { user: "nika_cinema", content: "საუკეთესო მიმოხილვები სწორედ ასეთი პერსპექტივიდან იწერება.", quoteOfUser: "elza_critic_first", daysAgo: 2 },
    { user: "green_ge", content: "სწორედ ამიტომ გვჭირდება მეტი ცნობიერება ამ თემაზე.", quoteOfUser: "tea_eco_first", daysAgo: 4 },
    { user: "ana_melody", content: "ეს ზუსტად ის განცდაა, რასაც კონცერტის შემდეგ ვგრძნობ.", quoteOfUser: "davit_beats_first", daysAgo: 2 },
    { user: "irakli_ceo", content: "მომხმარებლის უკუკავშირზე მეტი არაფერია ღირებული ადრეულ ეტაპზე.", quoteOfUser: "mzia_marketing_first", daysAgo: 3 },
    { user: "eka_gallery", content: "ზუსტად ამიტომ ვუჭერ მხარს ახალგაზრდა ხელოვანებს.", quoteOfUser: "tornike_sculptor_first", daysAgo: 4 },
  ];
  for (const q of crossQuotes) tweetIds.push(addTweet(q.user, q.content, { quoteOf: T[q.quoteOfUser], daysAgo: q.daysAgo }));

  // --- international users, posting in English and other languages, for a more global feed ---
  const internationalUsers: { username: string; name: string; bio: string; location: string; joinedDaysAgo: number; verified?: boolean }[] = [
    { username: "sarah_codes", name: "Sarah Mitchell", bio: "Frontend engineer. React, TypeScript, and way too much coffee.", location: "Austin, TX", joinedDaysAgo: 310, verified: true },
    { username: "mateo_designs", name: "Mateo Fernández", bio: "Diseñador de producto. Obsesionado con los detalles pequeños.", location: "Madrid, España", joinedDaysAgo: 260 },
    { username: "julien_photo", name: "Julien Moreau", bio: "Photographe indépendant. La lumière du matin est la meilleure.", location: "Lyon, France", joinedDaysAgo: 190 },
    { username: "lena_musik", name: "Lena Hoffmann", bio: "Musikerin und Produzentin. Neues Album kommt bald.", location: "Berlin, Deutschland", joinedDaysAgo: 220 },
    { username: "ivan_trader", name: "Ivan Petrov", bio: "Финансовый аналитик. Рынки никогда не спят.", location: "Москва, Россия", joinedDaysAgo: 340, verified: true },
    { username: "yuki_gamedev", name: "Yuki Tanaka", bio: "ゲーム開発者。インディーゲームを作っています。", location: "東京, 日本", joinedDaysAgo: 150 },
    { username: "elif_yazar", name: "Elif Kaya", bio: "Yazar ve içerik üreticisi. Kitaplar hayatımın merkezinde.", location: "İstanbul, Türkiye", joinedDaysAgo: 280 },
    { username: "priya_ml", name: "Priya Sharma", bio: "मशीन लर्निंग इंजीनियर। डेटा से कहानियाँ बनाती हूं।", location: "Bengaluru, India", joinedDaysAgo: 200, verified: true },
    { username: "joao_futebol", name: "João Silva", bio: "Comentarista esportivo. Futebol é vida.", location: "São Paulo, Brasil", joinedDaysAgo: 230 },
    { username: "giulia_cucina", name: "Giulia Romano", bio: "Food blogger. La cucina italiana non ha rivali.", location: "Bologna, Italia", joinedDaysAgo: 175 },
  ];

  const internationalPosts: { user: string; content: string; daysAgo: number }[] = [
    { user: "sarah_codes", content: "Finally shipped the redesign after three weeks of late nights. Worth it. #webdev", daysAgo: 3 },
    { user: "sarah_codes", content: "Hot take: dark mode should be the default everywhere, not an afterthought.", daysAgo: 1 },
    { user: "sarah_codes", content: "Code review comments are a love language if you think about it.", daysAgo: 5 },
    { user: "mateo_designs", content: "El buen diseño se nota cuando nadie lo nota. Ese es el objetivo.", daysAgo: 2 },
    { user: "mateo_designs", content: "Pasé la tarde ajustando espaciados de 2px. Sí, valió la pena.", daysAgo: 4 },
    { user: "julien_photo", content: "La lumière dorée de ce matin à Lyon était juste parfaite pour un shooting.", daysAgo: 2 },
    { user: "julien_photo", content: "Un bon appareil photo n'a jamais fait une bonne photo. C'est l'œil qui compte.", daysAgo: 6 },
    { user: "lena_musik", content: "Im Studio seit heute Morgen. Der neue Track fühlt sich endlich richtig an.", daysAgo: 1 },
    { user: "lena_musik", content: "Live-Auftritte geben mir mehr Energie als jeder Kaffee.", daysAgo: 3 },
    { user: "ivan_trader", content: "Волатильность рынка на этой неделе напомнила всем, зачем нужна диверсификация.", daysAgo: 2 },
    { user: "ivan_trader", content: "Долгосрочная стратегия почти всегда побеждает панику.", daysAgo: 5 },
    { user: "yuki_gamedev", content: "今日はインディーゲームの新しいレベルをテストしました。バグ修正が終わらない…", daysAgo: 1 },
    { user: "yuki_gamedev", content: "小さなチームで作るゲームには独自の魅力がある。", daysAgo: 4 },
    { user: "elif_yazar", content: "Yeni romanımın ilk taslağını bugün bitirdim. Şimdi düzenleme zamanı.", daysAgo: 2 },
    { user: "elif_yazar", content: "Bir kitabı bitirdikten sonraki boşluk hissi gerçekten var.", daysAgo: 6 },
    { user: "priya_ml", content: "Spent the day fine-tuning a model and the loss curve finally looks right 📉", daysAgo: 1 },
    { user: "priya_ml", content: "अच्छा डेटा हमेशा फैंसी मॉडल से बेहतर होता है।", daysAgo: 3 },
    { user: "joao_futebol", content: "Aquele gol no último minuto foi de arrepiar. Que jogo!", daysAgo: 2 },
    { user: "joao_futebol", content: "Time que joga junto há anos sempre se entende em campo.", daysAgo: 5 },
    { user: "giulia_cucina", content: "La pasta fatta in casa non ha paragoni. Oggi ho fatto tagliatelle fresche.", daysAgo: 1 },
    { user: "giulia_cucina", content: "Il segreto di un buon ragù? Tempo, e tanta pazienza.", daysAgo: 4 },
  ];

  for (const u of internationalUsers) {
    const id = randomUUID();
    userIds[u.username] = id;
    insertUser.run({
      id, username: u.username, name: u.name, email: `${u.username}@example.com`,
      password_hash: passwordHash, bio: u.bio, location: u.location,
      verified: u.verified ? 1 : 0, created_at: daysAgo(u.joinedDaysAgo),
    });
  }
  const lastPostIdByUser: Record<string, string> = {};
  for (const p of internationalPosts) {
    const id = addTweet(p.user, p.content, { daysAgo: p.daysAgo });
    tweetIds.push(id);
    lastPostIdByUser[p.user] = id;
  }

  // a couple of the international posts get photos too
  const intlWithPhotos: { user: string; seed: string }[] = [
    { user: "julien_photo", seed: "lyon-morning-light" },
    { user: "giulia_cucina", seed: "fresh-pasta-tagliatelle" },
  ];
  for (const p of intlWithPhotos) {
    const id = lastPostIdByUser[p.user];
    if (id) updateTweetImage.run(`https://picsum.photos/seed/${p.seed}/700/500`, id);
  }

  // --- attach photos to a curated set of posts, so the feed doesn't read as text-only ---
  const photoAssignments: { key: string; seed: string }[] = [
    { key: "p6", seed: "svaneti-mist-mountains" },
    { key: "p8", seed: "khachapuri-food-plate" },
    { key: "p10", seed: "svaneti-towers-travel" },
    { key: "p14", seed: "tbilisi-old-balcony" },
    { key: "p15", seed: "digital-watercolor-art" },
    { key: "p25", seed: "batumi-sea-sunset" },
    { key: "p26", seed: "gaming-setup-neon" },
    { key: "sandro_esports_first", seed: "esports-arena-crowd" },
    { key: "levan_fitness_first", seed: "gym-weights-training" },
    { key: "shota_garage_first", seed: "classic-car-garage" },
    { key: "temo_backpack_first", seed: "backpacker-mountain-trail" },
    { key: "dato_coffee_first", seed: "coffee-latte-art" },
    { key: "eka_gallery_first", seed: "modern-art-gallery" },
    { key: "vet_kote_first", seed: "vet-clinic-dog" },
    { key: "luka_stars_first", seed: "night-sky-stars" },
    { key: "ana_melody_first", seed: "concert-stage-lights" },
    { key: "tornike_sculptor_first", seed: "sculpture-studio-clay" },
    { key: "khatia_explores_first", seed: "travel-passport-map" },
    { key: "sopho_bakes_first", seed: "fresh-bread-bakery" },
    { key: "green_ge_first", seed: "forest-sunlight-green" },
    { key: "vano_wine_first", seed: "wine-vineyard-glass" },
    { key: "mariam_mural_first", seed: "street-art-mural" },
    { key: "beka_observatory_first", seed: "telescope-observatory-dome" },
    { key: "giorgi_aquarium_first", seed: "aquarium-fish-tank" },
  ];
  for (const p of photoAssignments) {
    const id = T[p.key];
    if (id) updateTweetImage.run(`https://picsum.photos/seed/${p.seed}/700/500`, id);
  }

  // --- polls ---
  const pollDefs: { user: string; content: string; options: string[]; daysAgo: number }[] = [
    { user: "sandro_esports", content: "რომელი ჟანრია თქვენი ფავორიტი გასართობად?", options: ["RPG", "Shooter", "Strategy", "Sports"], daysAgo: 2 },
    { user: "dato_coffee", content: "ყავა თუ ჩაი დილით?", options: ["ყავა ☕", "ჩაი 🍵"], daysAgo: 3 },
    { user: "nika_cinema", content: "წლის საუკეთესო ჟანრი კინოში თქვენი აზრით?", options: ["დრამა", "კომედია", "თრილერი", "ფანტასტიკა"], daysAgo: 5 },
    { user: "chess_master_ge", content: "რომელი გახსნა გირჩევნიათ თეთრებით?", options: ["e4", "d4", "Nf3", "c4"], daysAgo: 3 },
    { user: "basket_ge", content: "წლის საუკეთესო ლიგა თქვენი აზრით?", options: ["NBA", "ევროლიგა", "ეროვნული ლიგა"], daysAgo: 4 },
    { user: "giga_tailor", content: "რომელი სტილი გირჩევნიათ ყოველდღიურად?", options: ["კლასიკური", "სპორტული", "ვინტაჟი", "მინიმალისტური"], daysAgo: 3 },
    { user: "irakli_ceo", content: "რომელი გუნდის ზომაა თქვენთვის საუკეთესო სტარტაპში?", options: ["1-5", "6-15", "16-50", "50+"], daysAgo: 4 },
    { user: "green_ge", content: "რომელი ეკო-ჩვევა შემოგაქვთ ყველაზე ხშირად?", options: ["გადამუშავება", "ნაკლები პლასტმასი", "საზოგადოებრივი ტრანსპორტი", "ადგილობრივი პროდუქტი"], daysAgo: 5 },
    { user: "nino_novels", content: "რომელ ჟანრს კითხულობთ ყველაზე ხშირად?", options: ["რომანი", "დეტექტივი", "ფანტასტიკა", "პოეზია"], daysAgo: 2 },
    { user: "khatia_explores", content: "რომელი მოგზაურობის სტილი გირჩევნიათ?", options: ["ბექფექინგი", "ლუქსი", "როუდ-ტრიპი", "ჯგუფური ტური"], daysAgo: 3 },
    { user: "luka_stars", content: "რომელი ციური სხეულის ნახვა გინდოდათ ყველაზე მეტად?", options: ["სატურნის რგოლები", "მარსი", "ვარსკვლავური ნისლეული", "მთვარის კრატერები"], daysAgo: 4 },
  ];
  const pollTweetIds: string[] = [];
  for (const p of pollDefs) {
    const id = addTweet(p.user, p.content, { daysAgo: p.daysAgo });
    tweetIds.push(id);
    pollTweetIds.push(id);
    insertPoll.run(id, JSON.stringify(p.options), daysAgo(p.daysAgo));
  }

  // --- everyone exists and every tweet exists now: build the social graph ---
  const usernames = Object.keys(userIds);

  for (const follower of usernames) {
    for (const target of usernames) {
      if (follower === target) continue;
      if (Math.random() < 0.18) {
        insertFollow.run(userIds[follower], userIds[target], daysAgo(Math.floor(Math.random() * 300)));
      }
    }
  }
  ["elene_dev", "giorgi_ux", "newsbot", "nini_photo", "davit_startup", "ana_travels", "sandro_esports", "dr_natia", "ana_melody", "irakli_ceo", "chess_master_ge"].forEach((u) => {
    insertFollow.run(userIds["chiko"], userIds[u], now());
    insertFollow.run(userIds[u], userIds["chiko"], now());
  });

  for (const tweetId of tweetIds) {
    for (const username of usernames) {
      if (Math.random() < 0.16) {
        insertLike.run(userIds[username], tweetId, daysAgo(Math.floor(Math.random() * 5)));
      }
      if (Math.random() < 0.05) {
        insertRetweet.run(userIds[username], tweetId, daysAgo(Math.floor(Math.random() * 5)));
      }
    }
  }

  // scatter some poll votes
  for (const pollId of pollTweetIds) {
    const options = JSON.parse(
      (db.prepare("SELECT options FROM polls WHERE tweet_id = ?").get(pollId) as any).options
    ) as string[];
    for (const username of usernames) {
      if (Math.random() < 0.35) {
        insertPollVote.run(pollId, userIds[username], Math.floor(Math.random() * options.length), daysAgo(Math.floor(Math.random() * 4)));
      }
    }
  }

  db.prepare("UPDATE users SET pinned_tweet_id = ? WHERE id = ?").run(T["p3"], userIds["chiko"]);
  db.prepare("UPDATE users SET pinned_tweet_id = ? WHERE id = ?").run(T["p9"], userIds["davit_startup"]);
  db.prepare("UPDATE users SET pinned_tweet_id = ? WHERE id = ?").run(T["dr_natia_first"], userIds["dr_natia"]);

  const dmSeed: { from: string; to: string; content: string; daysAgo: number }[] = [
    { from: "elene_dev", to: "chiko", content: "მოგესალმები! ნახე ჩემი ბოლო commit, საინტერესო feedback მექნება.", daysAgo: 3 },
    { from: "chiko", to: "elene_dev", content: "რა თქმა უნდა, დღეს ვნახავ და დაგიწერ.", daysAgo: 3 },
    { from: "davit_startup", to: "chiko", content: "გვინდა შენთან პროექტზე ვისაუბროთ, გაქვს დრო ხვალ?", daysAgo: 1 },
    { from: "sandro_esports", to: "chiko", content: "გამარჯობა! ხვალინდელი სტრიმისთვის თანამშრომლობა გვინდოდა.", daysAgo: 2 },
  ];
  for (const m of dmSeed) insertMessage.run(randomUUID(), userIds[m.from], userIds[m.to], m.content, daysAgo(m.daysAgo));
}
seedIfEmpty();

export default db;
