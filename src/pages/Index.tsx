import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────
type Tab = "chats" | "search" | "channels" | "profile";
type ChatType = "private" | "group" | "channel";

interface UserProfile {
  id: number;
  phone: string;
  display_name: string;
  username?: string;
  bio?: string;
  age?: number;
  birth_date?: string;
  avatar_url?: string;
}

interface ChatItem {
  id: number;
  type: ChatType;
  name: string;
  avatar?: string;
  last_message?: string;
  last_time?: string;
  peer_id?: number;
  is_public?: boolean;
  member_count?: number;
  subscribers_count?: number;
}

interface Message {
  id: number;
  sender_id?: number;
  sender_name?: string;
  text: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────
const AVATAR_COLORS = [
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-rose-600",
  "from-pink-500 to-fuchsia-600",
  "from-amber-500 to-yellow-600",
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function colorIdx(id: number | string) {
  const n = typeof id === "number" ? id : id.charCodeAt(0);
  return n % AVATAR_COLORS.length;
}

function Avatar({
  name, url, id = 0, size = "md", online
}: { name: string; url?: string | null; id?: number; size?: "xs" | "sm" | "md" | "lg"; online?: boolean }) {
  const sizes = { xs: "w-7 h-7 text-[10px]", sm: "w-9 h-9 text-xs", md: "w-11 h-11 text-sm", lg: "w-16 h-16 text-lg" };
  return (
    <div className="relative shrink-0">
      {url ? (
        <img src={url} alt={name} className={`${sizes[size]} rounded-full object-cover`} />
      ) : (
        <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx(id)]} flex items-center justify-center font-semibold text-white`}>
          {initials(name)}
        </div>
      )}
      {online && <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-background" />}
    </div>
  );
}

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

// ─── Auth Screen ─────────────────────────────────────────
function AuthScreen({ onLogin }: { onLogin: (user: UserProfile, token: string) => void }) {
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoCode, setDemoCode] = useState("");

  const sendOtp = async () => {
    setError("");
    if (phone.length < 10) { setError("Введите корректный номер"); return; }
    setLoading(true);
    const res = await api.sendOtp(phone);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setDemoCode(res.demo_code || "");
    setStep("otp");
  };

  const verifyOtp = async () => {
    setError("");
    if (code.length !== 6) { setError("Код из 6 цифр"); return; }
    setLoading(true);
    const res = await api.verifyOtp(phone, code, name || undefined);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (res.is_new && !name) { setStep("name"); return; }
    localStorage.setItem("sc_token", res.token);
    localStorage.setItem("sc_user", JSON.stringify(res.user));
    onLogin(res.user, res.token);
  };

  const finishName = async () => {
    setLoading(true);
    const res = await api.verifyOtp(phone, code, name);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    localStorage.setItem("sc_token", res.token);
    localStorage.setItem("sc_user", JSON.stringify(res.user));
    onLogin(res.user, res.token);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
        <Icon name="Shield" size={32} className="text-primary-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-1">SafeChat</h1>
      <p className="text-sm text-muted-foreground mb-8 text-center">
        {step === "phone" && "Введите номер телефона для входа"}
        {step === "otp" && "Введите код из SMS"}
        {step === "name" && "Как вас зовут?"}
      </p>

      {step === "phone" && (
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-border focus-within:border-primary/50 transition-colors">
            <Icon name="Phone" size={16} className="text-muted-foreground" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="+7 900 000 00 00"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              type="tel"
              onKeyDown={e => e.key === "Enter" && sendOtp()}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={sendOtp}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Отправляем..." : "Получить код"}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="w-full space-y-3">
          <p className="text-xs text-muted-foreground text-center">Номер: {phone}</p>
          {demoCode && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <Icon name="Info" size={14} className="text-primary" />
              <p className="text-xs text-primary">Демо-код: <b>{demoCode}</b></p>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-border focus-within:border-primary/50 transition-colors">
            <Icon name="KeyRound" size={16} className="text-muted-foreground" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground tracking-widest"
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              type="text"
              inputMode="numeric"
              onKeyDown={e => e.key === "Enter" && verifyOtp()}
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={verifyOtp}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Проверяем..." : "Войти"}
          </button>
          <button onClick={() => setStep("phone")} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
            Изменить номер
          </button>
        </div>
      )}

      {step === "name" && (
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-border focus-within:border-primary/50 transition-colors">
            <Icon name="User" size={16} className="text-muted-foreground" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Ваше имя"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === "Enter" && finishName()}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={finishName}
            disabled={loading || !name.trim()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Сохраняем..." : "Начать"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Chat View ───────────────────────────────────────────
function ChatView({ chat, myId, onBack }: { chat: ChatItem; myId: number; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getMessages(chat.type, chat.id).then(res => {
      if (Array.isArray(res)) setMessages(res);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    });
  }, [chat.id, chat.type]);

  const send = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    const tmp: Message = { id: Date.now(), sender_id: myId, text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tmp]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    await api.sendMessage(chat.type, chat.id, text);
  };

  return (
    <div className="flex flex-col h-full animate-slide-in-right">
      <div className="flex items-center gap-3 px-3 py-3 border-b border-border shrink-0 glass">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <Icon name="ArrowLeft" size={20} />
        </button>
        <Avatar name={chat.name} url={chat.avatar} id={chat.id} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{chat.name}</p>
          <p className="text-xs text-muted-foreground">
            {chat.type === "private" && "приватный чат"}
            {chat.type === "group" && `${chat.member_count || ""} участников`}
            {chat.type === "channel" && `${chat.subscribers_count || ""} подписчиков`}
          </p>
        </div>
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <Icon name="MoreVertical" size={18} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
        <div className="flex justify-center mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 text-xs text-muted-foreground">
            <Icon name="Lock" size={10} />
            Сквозное шифрование
          </div>
        </div>
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {messages.map(msg => {
          const isOwn = msg.sender_id === myId;
          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} msg-appear`}>
              <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl ${isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"}`}>
                {!isOwn && chat.type !== "private" && (
                  <p className="text-[10px] font-semibold text-primary mb-0.5">{msg.sender_name}</p>
                )}
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className={`text-[10px] mt-0.5 ${isOwn ? "text-primary-foreground/70 text-right" : "text-muted-foreground"}`}>
                  {formatTime(msg.created_at)}{isOwn && " ✓✓"}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {chat.type !== "channel" && (
        <div className="px-3 py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary border border-border focus-within:border-primary/40 transition-colors">
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Сообщение..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
              />
            </div>
            <button
              onClick={send}
              className={`p-2.5 rounded-xl transition-all shrink-0 ${input.trim() ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-secondary text-muted-foreground"}`}
            >
              <Icon name="Send" size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chats Tab ───────────────────────────────────────────
function ChatsTab({ myId, onOpenChat }: { myId: number; onOpenChat: (c: ChatItem) => void }) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getPrivateChats(), api.getGroups()]).then(([privates, groups]) => {
      const items: ChatItem[] = [];
      if (Array.isArray(privates)) {
        privates.forEach((p: {id:number;peer_name:string;peer_avatar:string;peer_id:number;last_message:string;last_time:string}) => items.push({
          id: p.id, type: "private", name: p.peer_name, avatar: p.peer_avatar,
          peer_id: p.peer_id, last_message: p.last_message, last_time: p.last_time,
        }));
      }
      if (Array.isArray(groups)) {
        groups.forEach((g: {id:number;name:string;avatar_url:string;last_message:string;member_count:number}) => items.push({
          id: g.id, type: "group", name: g.name, avatar: g.avatar_url,
          last_message: g.last_message, member_count: g.member_count,
        }));
      }
      setChats(items);
      setLoading(false);
    });
  }, [myId]);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground px-8 text-center">
          <Icon name="MessageCircle" size={44} />
          <p className="text-sm">Нет чатов. Найдите пользователей во вкладке «Поиск» и начните общение</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <button key={`${chat.type}-${chat.id}`} onClick={() => onOpenChat(chat)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left">
              <Avatar name={chat.name} url={chat.avatar} id={chat.id} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-medium text-sm truncate flex items-center gap-1">
                    {chat.type === "group" && <Icon name="Users" size={12} className="text-muted-foreground shrink-0" />}
                    {chat.name}
                  </span>
                  {chat.last_time && <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatTime(chat.last_time)}</span>}
                </div>
                <p className="text-sm text-muted-foreground truncate">{chat.last_message || "Нет сообщений"}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      <CreateGroupButton onCreated={() => { setLoading(true); api.getGroups().then(g => { if(Array.isArray(g)) setChats(prev => [...prev.filter(c=>c.type!="group"), ...g.map((x:{id:number;name:string;avatar_url:string;last_message:string;member_count:number}) => ({id:x.id,type:"group" as ChatType,name:x.name,avatar:x.avatar_url,last_message:x.last_message,member_count:x.member_count}))]); setLoading(false); }); }} />
    </div>
  );
}

function CreateGroupButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await api.createGroup(name.trim(), desc, isPublic);
    setLoading(false);
    setOpen(false);
    setName(""); setDesc("");
    onCreated();
  };

  return (
    <>
      <div className="p-4 border-t border-border">
        <button onClick={() => setOpen(true)} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} /> Новая группа
        </button>
      </div>
      {open && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 animate-fade-in">
          <div className="bg-card rounded-t-2xl p-5 space-y-3 animate-slide-up">
            <h3 className="font-semibold text-foreground">Создать группу</h3>
            <input className="w-full px-3 py-2.5 rounded-xl bg-secondary text-sm outline-none placeholder:text-muted-foreground border border-border focus:border-primary/40 transition-colors"
              placeholder="Название группы" value={name} onChange={e => setName(e.target.value)} autoFocus />
            <input className="w-full px-3 py-2.5 rounded-xl bg-secondary text-sm outline-none placeholder:text-muted-foreground border border-border focus:border-primary/40 transition-colors"
              placeholder="Описание (необязательно)" value={desc} onChange={e => setDesc(e.target.value)} />
            <label className="flex items-center gap-3 py-1 cursor-pointer">
              <div onClick={() => setIsPublic(v => !v)} className={`w-10 h-5 rounded-full transition-colors relative ${isPublic ? "bg-primary" : "bg-secondary border border-border"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-foreground">Публичная группа</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm text-foreground hover:opacity-80 transition-opacity">Отмена</button>
              <button onClick={create} disabled={loading || !name.trim()} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? "Создаём..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Search Tab ──────────────────────────────────────────
function SearchTab({ onOpenChat }: { onOpenChat: (c: ChatItem) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{id:number;display_name:string;username:string;avatar_url:string;bio:string}[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await api.searchUsers(query);
      setLoading(false);
      if (Array.isArray(res)) setResults(res);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const startChat = async (user: {id:number;display_name:string;avatar_url:string}) => {
    const res = await api.startPrivateChat(user.id);
    if (res.chat_id) {
      onOpenChat({ id: res.chat_id, type: "private", name: user.display_name, avatar: user.avatar_url, peer_id: user.id });
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary border border-border focus-within:border-primary/50 transition-colors">
          <Icon name="Search" size={16} className="text-muted-foreground" />
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Поиск по имени или @username"
            value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          {query && <button onClick={() => setQuery("")}><Icon name="X" size={14} className="text-muted-foreground" /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}
        {!loading && results.length === 0 && query && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Icon name="UserSearch" size={40} />
            <p className="text-sm">Не найдено</p>
          </div>
        )}
        {!loading && !query && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground px-8 text-center">
            <Icon name="Search" size={40} />
            <p className="text-sm">Введите имя или @username для поиска</p>
          </div>
        )}
        {results.map(u => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
            <Avatar name={u.display_name} url={u.avatar_url} id={u.id} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{u.display_name}</p>
              <p className="text-xs text-muted-foreground">{u.username || ""}{u.bio ? ` · ${u.bio.slice(0, 30)}` : ""}</p>
            </div>
            <button onClick={() => startChat(u)} className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
              Написать
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Channels Tab ─────────────────────────────────────────
function ChannelsTab({ onOpenChat }: { onOpenChat: (c: ChatItem) => void }) {
  const [myChannels, setMyChannels] = useState<{id:number;name:string;username:string;avatar_url:string;last_post:string;subscribers_count:number}[]>([]);
  const [explore, setExplore] = useState<{id:number;name:string;username:string;description:string;subscribers_count:number;is_subscribed:boolean}[]>([]);
  const [tab, setTab] = useState<"mine" | "explore" | "create">("mine");
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.getChannels().then(res => { if (Array.isArray(res)) setMyChannels(res); setLoading(false); });
    api.exploreChannels().then(res => { if (Array.isArray(res)) setExplore(res); });
  }, []);

  const subscribe = async (id: number) => {
    await api.subscribeChannel(id);
    setExplore(prev => prev.map(c => c.id === id ? { ...c, is_subscribed: true } : c));
    api.getChannels().then(res => { if (Array.isArray(res)) setMyChannels(res); });
  };

  const createChannel = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    await api.createChannel(createName.trim(), createUsername.trim(), createDesc, isPublic);
    setCreating(false);
    setCreateName(""); setCreateUsername(""); setCreateDesc("");
    setTab("mine");
    api.getChannels().then(res => { if (Array.isArray(res)) setMyChannels(res); });
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex gap-1 px-4 pt-3 pb-2">
        {([["mine","Мои"], ["explore","Обзор"], ["create","Создать"]] as [typeof tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "mine" && (
          loading ? <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
          : myChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground px-8 text-center">
              <Icon name="Radio" size={40} />
              <p className="text-sm">Вы не подписаны ни на один канал. Откройте «Обзор» или создайте свой</p>
            </div>
          ) : myChannels.map(c => (
            <button key={c.id} onClick={() => onOpenChat({ id: c.id, type: "channel", name: c.name, avatar: c.avatar_url, last_message: c.last_post, subscribers_count: c.subscribers_count })}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left">
              <Avatar name={c.name} url={c.avatar_url} id={c.id} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.subscribers_count} подписчиков</p>
              </div>
            </button>
          ))
        )}

        {tab === "explore" && explore.map(c => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
            <Avatar name={c.name} id={c.id} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.subscribers_count} подписчиков{c.description ? ` · ${c.description.slice(0,30)}` : ""}</p>
            </div>
            <button onClick={() => subscribe(c.id)}
              disabled={c.is_subscribed}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${c.is_subscribed ? "bg-secondary text-muted-foreground" : "bg-primary/15 text-primary hover:bg-primary/25"}`}>
              {c.is_subscribed ? "Подписан" : "Подписаться"}
            </button>
          </div>
        ))}

        {tab === "create" && (
          <div className="p-4 space-y-3">
            <input className="w-full px-3 py-2.5 rounded-xl bg-secondary text-sm outline-none placeholder:text-muted-foreground border border-border focus:border-primary/40 transition-colors"
              placeholder="Название канала *" value={createName} onChange={e => setCreateName(e.target.value)} autoFocus />
            <input className="w-full px-3 py-2.5 rounded-xl bg-secondary text-sm outline-none placeholder:text-muted-foreground border border-border focus:border-primary/40 transition-colors"
              placeholder="@username (необязательно)" value={createUsername} onChange={e => setCreateUsername(e.target.value)} />
            <textarea className="w-full px-3 py-2.5 rounded-xl bg-secondary text-sm outline-none placeholder:text-muted-foreground border border-border focus:border-primary/40 transition-colors resize-none"
              placeholder="Описание" rows={3} value={createDesc} onChange={e => setCreateDesc(e.target.value)} />
            <label className="flex items-center gap-3 py-1 cursor-pointer">
              <div onClick={() => setIsPublic(v => !v)} className={`w-10 h-5 rounded-full transition-colors relative ${isPublic ? "bg-primary" : "bg-secondary border border-border"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-foreground">Публичный канал</span>
            </label>
            <button onClick={createChannel} disabled={creating || !createName.trim()}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {creating ? "Создаём..." : "Создать канал"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────
function ProfileTab({ user, onLogout, onUpdate }: { user: UserProfile; onLogout: () => void; onUpdate: (u: UserProfile) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ display_name: user.display_name, username: user.username || "", bio: user.bio || "", age: String(user.age || ""), birth_date: user.birth_date || "" });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setSaving(true);
    const data: Record<string, string | number | null> = { display_name: form.display_name, username: form.username || null, bio: form.bio || null };
    if (form.age) data.age = parseInt(form.age);
    if (form.birth_date) data.birth_date = form.birth_date;
    await api.updateProfile(data);
    const fresh = await api.getProfile();
    setSaving(false);
    setEditing(false);
    if (!fresh.error) { onUpdate(fresh); localStorage.setItem("sc_user", JSON.stringify(fresh)); }
  };

  const uploadAvatar = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = (e.target?.result as string).split(",")[1];
      const res = await api.uploadAvatar(b64, file.type);
      if (res.avatar_url) {
        const fresh = { ...user, avatar_url: res.avatar_url };
        onUpdate(fresh);
        localStorage.setItem("sc_user", JSON.stringify(fresh));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-y-auto">
      <div className="flex flex-col items-center pt-8 pb-5 px-4">
        <div className="relative mb-3 cursor-pointer" onClick={() => fileRef.current?.click()}>
          <Avatar name={user.display_name} url={user.avatar_url} id={user.id} size="lg" />
          <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background">
            <Icon name="Camera" size={13} className="text-primary-foreground" />
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
        </div>
        <h2 className="text-lg font-bold text-foreground">{user.display_name}</h2>
        {user.username && <p className="text-sm text-primary">@{user.username}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">{user.phone}</p>
      </div>

      <div className="px-4 space-y-2">
        {!editing ? (
          <>
            {user.bio && (
              <div className="px-4 py-3 rounded-xl bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">О себе</p>
                <p className="text-sm text-foreground">{user.bio}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {user.age && (
                <div className="px-4 py-3 rounded-xl bg-secondary">
                  <p className="text-xs text-muted-foreground mb-1">Возраст</p>
                  <p className="text-sm font-medium">{user.age}</p>
                </div>
              )}
              {user.birth_date && (
                <div className="px-4 py-3 rounded-xl bg-secondary">
                  <p className="text-xs text-muted-foreground mb-1">Дата рождения</p>
                  <p className="text-sm font-medium">{user.birth_date}</p>
                </div>
              )}
            </div>
            <button onClick={() => setEditing(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors">
              <Icon name="Pencil" size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">Редактировать профиль</span>
              <Icon name="ChevronRight" size={16} className="text-muted-foreground ml-auto" />
            </button>
            {[{ icon: "Bell", label: "Уведомления" }, { icon: "Shield", label: "Конфиденциальность" }, { icon: "Lock", label: "Сквозное шифрование" }].map(item => (
              <button key={item.label} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors">
                <Icon name={item.icon} fallback="CircleAlert" size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium">{item.label}</span>
                <Icon name="ChevronRight" size={16} className="text-muted-foreground ml-auto" />
              </button>
            ))}
          </>
        ) : (
          <>
            {[
              { key: "display_name", label: "Имя", placeholder: "Ваше имя" },
              { key: "username", label: "Username", placeholder: "@username" },
              { key: "bio", label: "О себе", placeholder: "Расскажите о себе" },
              { key: "age", label: "Возраст", placeholder: "25" },
              { key: "birth_date", label: "Дата рождения", placeholder: "ГГГГ-ММ-ДД" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <p className="text-xs text-muted-foreground mb-1 px-1">{label}</p>
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary text-sm outline-none border border-border focus:border-primary/40 transition-colors"
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  type={key === "age" ? "number" : "text"}
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm hover:opacity-80 transition-opacity">Отмена</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </>
        )}

        <div className="mt-2">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 mb-2">
            <Icon name="ShieldCheck" size={14} className="text-primary" />
            <p className="text-xs text-primary font-medium">Сквозное шифрование активно</p>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 transition-colors">
            <Icon name="LogOut" size={16} className="text-destructive" />
            <span className="text-sm font-medium text-destructive">Выйти</span>
          </button>
        </div>
      </div>
      <div className="h-4" />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "chats", icon: "MessageCircle", label: "Чаты" },
  { id: "search", icon: "Search", label: "Поиск" },
  { id: "channels", icon: "Radio", label: "Каналы" },
  { id: "profile", icon: "User", label: "Профиль" },
];

export default function Index() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try { return JSON.parse(localStorage.getItem("sc_user") || "null"); } catch { return null; }
  });
  const [tab, setTab] = useState<Tab>("chats");
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);

  const logout = () => {
    localStorage.removeItem("sc_token");
    localStorage.removeItem("sc_user");
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:w-[390px] h-screen sm:h-[760px] sm:rounded-3xl overflow-hidden flex flex-col bg-card shadow-2xl shadow-black/60 border border-border relative">
        {!user ? (
          <AuthScreen onLogin={(u) => setUser(u)} />
        ) : activeChat ? (
          <ChatView chat={activeChat} myId={user.id} onBack={() => setActiveChat(null)} />
        ) : (
          <>
            <div className="px-4 pt-5 pb-1 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Icon name="Shield" size={14} className="text-primary-foreground" />
                </div>
                <h1 className="text-base font-bold tracking-tight">SafeChat</h1>
              </div>
              <button className="p-2 rounded-xl hover:bg-secondary transition-colors">
                <Icon name="Settings" size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {tab === "chats" && <ChatsTab myId={user.id} onOpenChat={setActiveChat} />}
              {tab === "search" && <SearchTab onOpenChat={setActiveChat} />}
              {tab === "channels" && <ChannelsTab onOpenChat={setActiveChat} />}
              {tab === "profile" && <ProfileTab user={user} onLogout={logout} onUpdate={setUser} />}
            </div>

            <div className="shrink-0 border-t border-border px-2 py-1 glass">
              <div className="flex">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    <Icon name={t.icon} fallback="CircleAlert" size={20} />
                    <span className="text-[10px] font-medium">{t.label}</span>
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
