// src/config/packagesConfig.js
//
// كل القيم اللي ممكن تحتاج تتغير بدون ما تلمس منطق التطبيق موجودة هنا.

export const PACKAGES_TABLE = "packages";

export const VALIDATION = {
  nameMinLength: 3,
  nameMaxLength: 60,
  notesMaxLength: 500,
  // كلمات ممنوعة (مثال — كمّلها بما يناسبك، البحث case-insensitive وبيتجاهل التشكيل)
  bannedWords: ["كلمة1", "كلمة2", "badword1", "badword2"],
};

export const GALLERY = {
  pageSize: 9,
  sortOptions: [
    { value: "newest", label: "الأحدث" },
    { value: "oldest", label: "الأقدم" },
    { value: "price_desc", label: "الأعلى سعراً" },
    { value: "price_asc", label: "الأقل سعراً" },
  ],
};

export const PACKAGE_STATUS = {
  VISIBLE: "visible",
  HIDDEN: "hidden",
  FEATURED: "featured",
};
