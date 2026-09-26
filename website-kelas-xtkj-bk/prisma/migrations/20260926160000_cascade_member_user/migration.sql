-- CascadeDeleteClassMemberUser: akun murid yang dihapus ikut menghapus
-- membership-nya (tidak lagi meninggalkan member orphan yang masih tampil
-- di daftar anggota). Menggantikan ON DELETE SET NULL.
ALTER TABLE "ClassMember"
  DROP CONSTRAINT "ClassMember_userId_fkey";

ALTER TABLE "ClassMember"
  ADD CONSTRAINT "ClassMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;
