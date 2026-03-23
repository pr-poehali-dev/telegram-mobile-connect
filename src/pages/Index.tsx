import { useState } from "react";
import Icon from "@/components/ui/icon";

type Tab = "chats" | "search" | "notifications" | "profile";
type View = "list" | "chat";

interface User {
  id: number;
  name: string;
  username: string;
  avatar: string;
  online: boolean;
  lastSeen?: string;
}

interface Message {
  id: number;
  text: string;
  time: string;
  isOwn: boolean;
  encrypted?: boolean;
}

interface Chat {
  id: number;
  user: User;
  lastMessage: string;
  time: string;
  unread: number;
  messages: Message[];
}

interface Notification {
  id: number;
  user: User;
  text: string;
  time: string;
  read: boolean;
}

const USERS: User[] = [
  { id: 1, name: "Алексей Петров", username: "@alexey_p", avatar: "АП", online: true },
  { id: 2, name: "Мария Соколова", username: "@masha_s", avatar: "МС", online: false, lastSeen: "1ч назад" },
  { id: 3, name: "Дмитрий Волков", username: "@d_volkov", avatar: "ДВ", online: true },
  { id: 4, name: "Елена Новикова", username: "@lena_nov", avatar: "ЕН", online: false, lastSeen: "вчера" },
  { id: 5, name: "Игорь Смирнов", username: "@igor_sm", avatar: "ИС", online: true },
  { id: 6, name: "Ольга Кузнецова", username: "@olga_k", avatar: "ОК", online: false, lastSeen: "3д назад" },
];

const CHATS: Chat[] = [
  {
    id: 1,
    user: USERS[0],
    lastMessage: "Привет! Как дела?",
    time: "14:32",
    unread: 2,
    messages: [
      { id: 1, text: "Привет!", time: "14:28", isOwn: false },
      { id: 2, text: "Привет! Как дела?", time: "14:32", isOwn: false },
      { id: 3, text: "Всё хорошо, спасибо 👍", time: "14:35", isOwn: true },
    ],
  },
  {
    id: 2,
    user: USERS[2],
    lastMessage: "Встреча в 18:00 не забудь",
    time: "12:10",
    unread: 0,
    messages: [
      { id: 1, text: "Дим, встреча в 18:00 не забудь", time: "12:10", isOwn: false },
      { id: 2, text: "Ок, буду", time: "12:15", isOwn: true },
    ],
  },
  {
    id: 3,
    user: USERS[1],
    lastMessage: "Отправила файлы на почту",
    time: "вчера",
    unread: 0,
    messages: [
      { id: 1, text: "Отправила файлы на почту, проверь", time: "вчера", isOwn: false },
    ],
  },
  {
    id: 4,
    user: USERS[4],
    lastMessage: "Спасибо, разберусь!",
    time: "пн",
    unread: 1,
    messages: [
      { id: 1, text: "Спасибо, разберусь!", time: "пн", isOwn: false },
    ],
  },
];

const NOTIFICATIONS: Notification[] = [
  { id: 1, user: USERS[0], text: "написал вам сообщение", time: "14:32", read: false },
  { id: 2, user: USERS[2], text: "добавил вас в контакты", time: "12:01", read: false },
  { id: 3, user: USERS[4], text: "написал вам сообщение", time: "пн", read: true },
  { id: 4, user: USERS[1], text: "написала вам сообщение", time: "вчера", read: true },
];

const AVATAR_COLORS = [
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-rose-600",
  "from-pink-500 to-fuchsia-600",
  "from-amber-500 to-yellow-600",
];

function Avatar({ user, size = "md" }: { user: User; size?: "sm" | "md" | "lg" }) {
  const idx = user.id % AVATAR_COLORS.length;
  const sizes = { sm: "w-9 h-9 text-xs", md: "w-11 h-11 text-sm", lg: "w-16 h-16 text-lg" };
  return (
    <div className="relative shrink-0">
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${AVATAR_COLORS[idx]} flex items-center justify-center font-semibold text-white`}>
        {user.avatar}
      </div>
      {user.online && (
        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-background" />
      )}
    </div>
  );
}

function ChatsTab({
  chats,
  onOpenChat,
}: {
  chats: Chat[];
  onOpenChat: (chat: Chat) => void;
}) {
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary">
          <Icon name="Search" size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Поиск по чатам...</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onOpenChat(chat)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
          >
            <Avatar user={chat.user} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="font-medium text-sm text-foreground truncate">{chat.user.name}</span>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">{chat.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground truncate pr-2">{chat.lastMessage}</span>
                {chat.unread > 0 && (
                  <span className="shrink-0 min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center px-1 font-medium">
                    {chat.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="p-4">
        <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} />
          Новый чат
        </button>
      </div>
    </div>
  );
}

function SearchTab() {
  const [query, setQuery] = useState("");
  const filtered = query.length > 0
    ? USERS.filter(u =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.username.toLowerCase().includes(query.toLowerCase())
      )
    : USERS;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary border border-border focus-within:border-primary/50 transition-colors">
          <Icon name="Search" size={16} className="text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Поиск пользователей..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <Icon name="X" size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      {!query && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Все пользователи</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Icon name="UserSearch" size={40} />
            <p className="text-sm">Пользователей не найдено</p>
          </div>
        ) : (
          filtered.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
              <Avatar user={user} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.username} · {user.online ? (
                    <span className="text-green-400">онлайн</span>
                  ) : (
                    `был(а) ${user.lastSeen}`
                  )}
                </p>
              </div>
              <button className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                Написать
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const unread = NOTIFICATIONS.filter(n => !n.read).length;
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Уведомления</h2>
          {unread > 0 && (
            <p className="text-xs text-muted-foreground">{unread} непрочитанных</p>
          )}
        </div>
        {unread > 0 && (
          <button className="text-xs text-primary hover:opacity-75 transition-opacity">
            Прочитать все
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {NOTIFICATIONS.map((notif) => (
          <div
            key={notif.id}
            className={`flex items-center gap-3 px-4 py-3 transition-colors ${!notif.read ? "bg-primary/5" : "hover:bg-secondary/50"}`}
          >
            <div className="relative">
              <Avatar user={notif.user} size="sm" />
              {!notif.read && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium text-foreground">{notif.user.name}</span>{" "}
                <span className="text-muted-foreground">{notif.text}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{notif.time}</p>
            </div>
            {!notif.read && (
              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileTab() {
  const me = { name: "Вы", username: "@my_account", avatar: "ВЫ", online: true, id: 0 };
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex flex-col items-center pt-8 pb-6 px-4">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white">
            ВЫ
          </div>
          <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-background" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Мой профиль</h2>
        <p className="text-sm text-muted-foreground">@my_account</p>
      </div>

      <div className="px-4 space-y-2">
        {[
          { icon: "User", label: "Редактировать профиль" },
          { icon: "Bell", label: "Уведомления" },
          { icon: "Shield", label: "Конфиденциальность" },
          { icon: "Lock", label: "Сквозное шифрование" },
          { icon: "Palette", label: "Оформление" },
          { icon: "HelpCircle", label: "Помощь" },
        ].map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors text-left"
          >
            <Icon name={item.icon} fallback="CircleAlert" size={18} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground ml-auto" />
          </button>
        ))}
      </div>

      <div className="mt-auto p-4">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
          <Icon name="ShieldCheck" size={16} className="text-primary" />
          <p className="text-xs text-primary font-medium">Сквозное шифрование активно</p>
        </div>
      </div>
    </div>
  );
}

function ChatView({ chat, onBack }: { chat: Chat; onBack: () => void }) {
  const [messages, setMessages] = useState(chat.messages);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => [
      ...prev,
      { id: Date.now(), text: input.trim(), time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }), isOwn: true }
    ]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full animate-slide-in-right">
      <div className="flex items-center gap-3 px-3 py-3 border-b border-border glass shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <Icon name="ArrowLeft" size={20} className="text-foreground" />
        </button>
        <Avatar user={chat.user} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">{chat.user.name}</p>
          <p className="text-xs text-muted-foreground">
            {chat.user.online ? <span className="text-green-400">онлайн</span> : `был(а) ${chat.user.lastSeen}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Icon name="Phone" size={18} className="text-muted-foreground" />
          </button>
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Icon name="MoreVertical" size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        <div className="flex justify-center mb-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 text-xs text-muted-foreground">
            <Icon name="Lock" size={10} />
            Сквозное шифрование включено
          </div>
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isOwn ? "justify-end" : "justify-start"} msg-appear`}>
            <div
              className={`max-w-[78%] px-3.5 py-2 rounded-2xl ${
                msg.isOwn
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary text-foreground rounded-bl-sm"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <p className={`text-[10px] mt-0.5 ${msg.isOwn ? "text-primary-foreground/70 text-right" : "text-muted-foreground"}`}>
                {msg.time}
                {msg.isOwn && " ✓✓"}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 py-3 border-t border-border shrink-0">
        <div className="flex items-center gap-2">
          <button className="p-2.5 rounded-xl hover:bg-secondary transition-colors shrink-0">
            <Icon name="Paperclip" size={18} className="text-muted-foreground" />
          </button>
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary border border-border focus-within:border-primary/40 transition-colors">
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Сообщение..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
          </div>
          <button
            onClick={send}
            className={`p-2.5 rounded-xl transition-all shrink-0 ${
              input.trim()
                ? "bg-primary text-primary-foreground hover:opacity-90 scale-100"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <Icon name="Send" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

const TAB_CONFIG: { id: Tab; icon: string; label: string }[] = [
  { id: "chats", icon: "MessageCircle", label: "Чаты" },
  { id: "search", icon: "Search", label: "Поиск" },
  { id: "notifications", icon: "Bell", label: "Оповещения" },
  { id: "profile", icon: "User", label: "Профиль" },
];

export default function Index() {
  const [tab, setTab] = useState<Tab>("chats");
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const unreadNotifs = NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:w-[390px] h-screen sm:h-[760px] sm:rounded-3xl overflow-hidden flex flex-col bg-card shadow-2xl shadow-black/60 border border-border relative">
        {activeChat ? (
          <ChatView chat={activeChat} onBack={() => setActiveChat(null)} />
        ) : (
          <>
            <div className="px-4 pt-5 pb-1 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                    <Icon name="Shield" size={14} className="text-primary-foreground" />
                  </div>
                  <h1 className="text-base font-bold text-foreground tracking-tight">SafeChat</h1>
                </div>
                <button className="p-2 rounded-xl hover:bg-secondary transition-colors">
                  <Icon name="Settings" size={18} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {tab === "chats" && (
                <ChatsTab chats={CHATS} onOpenChat={setActiveChat} />
              )}
              {tab === "search" && <SearchTab />}
              {tab === "notifications" && <NotificationsTab />}
              {tab === "profile" && <ProfileTab />}
            </div>

            <div className="shrink-0 border-t border-border px-2 py-1 glass">
              <div className="flex">
                {TAB_CONFIG.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${
                      tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="relative">
                      <Icon name={t.icon} fallback="CircleAlert" size={20} />
                      {t.id === "notifications" && unreadNotifs > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold border border-background">
                          {unreadNotifs}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium ${tab === t.id ? "tab-active" : ""}`}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}