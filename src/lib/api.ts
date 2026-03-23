const URLS = {
  auth: "https://functions.poehali.dev/3b7a5f10-7487-4daa-8110-d9e0b2f64c15",
  profile: "https://functions.poehali.dev/2a74c942-cf1b-4501-91d9-9d25ce16fbcb",
  chats: "https://functions.poehali.dev/37c400f7-3702-4fc0-97b6-a9642fd7ae38",
  channels: "https://functions.poehali.dev/0f3d2817-3e96-48cd-ab2d-0a018237e0df",
};

function getToken() {
  return localStorage.getItem("sc_token") || "";
}

async function req(base: keyof typeof URLS, path: string, method = "GET", body?: object) {
  const res = await fetch(URLS[base] + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

export const api = {
  sendOtp: (phone: string) => req("auth", "/send-otp", "POST", { phone }),
  verifyOtp: (phone: string, code: string, display_name?: string) =>
    req("auth", "/verify-otp", "POST", { phone, code, display_name }),

  getProfile: () => req("profile", "/"),
  updateProfile: (data: object) => req("profile", "/", "PUT", data),
  uploadAvatar: (image: string, content_type: string) =>
    req("profile", "/avatar", "POST", { image, content_type }),
  searchUsers: (q: string) => req("profile", `/search?q=${encodeURIComponent(q)}`),

  getPrivateChats: () => req("chats", "/private"),
  startPrivateChat: (peer_id: number) => req("chats", "/private", "POST", { peer_id }),
  getMessages: (chat_type: string, chat_id: number) =>
    req("chats", `/messages?chat_type=${chat_type}&chat_id=${chat_id}`),
  sendMessage: (chat_type: string, chat_id: number, text: string) =>
    req("chats", "/messages", "POST", { chat_type, chat_id, text }),
  getGroups: () => req("chats", "/groups"),
  createGroup: (name: string, description: string, is_public: boolean) =>
    req("chats", "/groups", "POST", { name, description, is_public }),

  getChannels: () => req("channels", "/"),
  createChannel: (name: string, username: string, description: string, is_public: boolean) =>
    req("channels", "/", "POST", { name, username, description, is_public }),
  subscribeChannel: (channel_id: number) => req("channels", "/subscribe", "POST", { channel_id }),
  exploreChannels: (q = "") => req("channels", `/explore?q=${encodeURIComponent(q)}`),
};
