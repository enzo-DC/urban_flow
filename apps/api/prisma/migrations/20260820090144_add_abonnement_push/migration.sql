-- Note : `prisma migrate dev` avait initialement genere ici des DROP INDEX
-- sur itineraires_*_gist / segments_*_gist. Ce ne sont pas des index
-- obsoletes : ils portent sur des colonnes geography en Unsupported()
-- (invisibles du DSL Prisma, voir la migration initiale) que le moteur de
-- diff ne peut pas voir dans le schema — il les a donc consideres comme "en
-- trop" et proposait de les supprimer. Retires manuellement de cette
-- migration pour ne jamais les perdre sur un futur `migrate deploy`.

-- CreateTable
CREATE TABLE "abonnements_push" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "clePublique" TEXT NOT NULL,
    "cleAuth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonnements_push_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "abonnements_push_endpoint_key" ON "abonnements_push"("endpoint");

-- AddForeignKey
ALTER TABLE "abonnements_push" ADD CONSTRAINT "abonnements_push_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
