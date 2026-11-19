-- Seed kelas awal. Aman dijalankan ulang: kelas yang sudah ada tidak diduplikasi
-- dan label/status yang sudah diubah admin tidak ditimpa.
insert into public.classes (label, sort_order)
values ('XII RPL 1', 1), ('XII RPL 2', 2)
on conflict ((lower(label))) do nothing;
