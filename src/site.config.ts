export const SITE = {
  title: "zhang-llmlab | 个人网站",
  description: "记录技术笔记，展示作品集与项目复盘。",
  url: "https://zhang-llmlab.github.io",
  author: "zhang-llmlab"
};

/** 右侧边栏个人卡片（头像放 public/images/）；social 可填 email / github / music */
export const PROFILE = {
  name: "zhang-llmlab",
  bio: "记录技术笔记，展示作品集与项目复盘。",
  avatar: "/images/avatar.svg",
  social: {
    github: "https://github.com/zhang-llmlab"
  } as { email?: string; github?: string; music?: string }
};

/** 首页全屏头图：文案与轮播间隔（图片放在 public/images/main_page_images/） */
export const HOME_HERO = {
  title: "",
  slogans: [
    "用工程化方式记录思考，展示作品。",
    "把笔记写成工程，把作品写成叙事。",
    "Never put off till tomorrow what you can do today."
  ],
  carouselIntervalMs: 7000,
  fadeMs: 1000
} as const;
