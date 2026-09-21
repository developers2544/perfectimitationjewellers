# Perfect Imitation Jewellers — Website

Static website (HTML/CSS/JS) + Supabase (admin data, login, Exclusive photos) + Cloudflare Pages hosting.

```
public/                  <- ye poora folder Cloudflare Pages par deploy hota hai
  index.html             main website
  admin.html             owner panel (website par "Pravin Lomrod" naam par 2 baar tap)
  assets/js/supabase-config.js   <- yahan Supabase URL + anon key daalni hai
supabase/schema.sql      <- Supabase me ek baar run karna hai
```

## 1. Supabase setup (10 min)
1. supabase.com par naya project banao (region: Mumbai / ap-south-1).
2. **SQL Editor → New query** → `supabase/schema.sql` ka poora content paste karo → **Run**.
   Isse tables, security rules aur `exclusive` photo bucket ban jayega.
3. **Authentication → Users → Add user → Create new user**: owner ka email + password daalo, "Auto confirm user" ON rakho.
   Yahi email/password admin login me chalega.
4. **Authentication → Sign In / Providers → Email**: **"Allow new users to sign up" OFF** kar do.
   (Zaroori hai — warna koi bhi account bana kar edit kar sakta hai.)
5. **Project Settings → API**: `Project URL` aur `anon public` key copy karo aur
   `public/assets/js/supabase-config.js` me paste karo.

## 2. Cloudflare Pages deploy (Workers nahi, Pages)
1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets** (ya GitHub repo connect).
2. Upload me sirf **`public` folder** do. Build command: none. Output directory: `public` (Git se ho to).
3. Deploy. Domain baad me **Custom domains** se add kar dena.

## Photo upload / save par permission error aaye
Supabase > SQL Editor me `supabase/fix-permissions.sql` run karo, phir admin se dobara try karo.

## 3. Owner kaise use karega
- About section me **Pravin ki photo ya naam par 2 baar tap** → admin page khulega → email + password.
- **Products & rates**: naam, type, finish, uses, wholesale rate (from / up to) → **Save changes**.
- **Exclusive**: photo (1 zaroori, 2nd optional) + naam + type/note/rate → **Add item**. Edit, Hide/Show, Move up/down, Delete sab wahi.
  Koi item visible na ho to website par Exclusive section apne aap chhup jata hai.
- **Store details**: about text, address, timing, maps link, WhatsApp number, Instagram.

## Notes
- Supabase connect hone se pehle bhi site default content ke saath chalti hai.
- Rate khali ho to product detail me "On request" dikhta hai.
- WhatsApp order message: product ka naam + request. Number: `918451087229`.
- Product photos `public/assets/img/products/` me hain (box + as worn). Naya fixed product add karna ho to `assets/js/data.js` me entry + 2 photos.
