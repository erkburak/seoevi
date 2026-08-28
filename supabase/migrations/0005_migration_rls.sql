-- ---------------------------------------------------------------------
-- schema_migrations tablosunu kilitle
--
-- Bu tablo yalnızca migration betiği tarafından (doğrudan PostgreSQL
-- bağlantısıyla, tablo sahibi olarak) yazılır. Uygulama istemcilerinin
-- okumasına gerek yoktur. Politika tanımlanmadan RLS açıldığında anon ve
-- authenticated rolleri hiçbir satıra erişemez; tablo sahibi ve servis
-- rolü RLS'den muaf olduğu için migration akışı etkilenmez.
-- ---------------------------------------------------------------------

alter table public.schema_migrations enable row level security;

revoke all on public.schema_migrations from anon, authenticated;
