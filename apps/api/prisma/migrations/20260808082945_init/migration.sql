-- Requis avant toute colonne "geography" : PostGIS n'est pas actif par defaut sur Postgres.
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "consentementRgpdAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profils_mobilite" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "modesPreferes" TEXT[],
    "besoinsAccessibilite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profils_mobilite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operateurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "typeService" TEXT NOT NULL,

    CONSTRAINT "operateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itineraires" (
    "id" TEXT NOT NULL,
    "dureeSecondes" INTEGER NOT NULL,
    "co2Grammes" INTEGER NOT NULL,
    "depart" geography(Point, 4326) NOT NULL,
    "arrivee" geography(Point, 4326) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itineraires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segments" (
    "id" TEXT NOT NULL,
    "itineraireId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "distanceMetres" INTEGER NOT NULL,
    "dureeSecondes" INTEGER NOT NULL,
    "co2Grammes" INTEGER NOT NULL,
    "operateurId" TEXT,
    "depart" geography(Point, 4326) NOT NULL,
    "arrivee" geography(Point, 4326) NOT NULL,

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trajets" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "itineraireId" TEXT NOT NULL,
    "effectueLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trajets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empreintes_carbone" (
    "id" TEXT NOT NULL,
    "trajetId" TEXT NOT NULL,
    "co2Grammes" INTEGER NOT NULL,
    "co2EviteGrammes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empreintes_carbone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recompenses" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "obtenueLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recompenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profils_mobilite_utilisateurId_key" ON "profils_mobilite"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "operateurs_nom_key" ON "operateurs"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "trajets_itineraireId_key" ON "trajets"("itineraireId");

-- CreateIndex
CREATE UNIQUE INDEX "empreintes_carbone_trajetId_key" ON "empreintes_carbone"("trajetId");

-- CreateIndex (GiST obligatoire sur toute colonne geography, sinon les recherches de proximite s'effondrent)
CREATE INDEX "itineraires_depart_gist" ON "itineraires" USING GIST ("depart");

-- CreateIndex
CREATE INDEX "itineraires_arrivee_gist" ON "itineraires" USING GIST ("arrivee");

-- CreateIndex
CREATE INDEX "segments_depart_gist" ON "segments" USING GIST ("depart");

-- CreateIndex
CREATE INDEX "segments_arrivee_gist" ON "segments" USING GIST ("arrivee");

-- AddForeignKey
ALTER TABLE "profils_mobilite" ADD CONSTRAINT "profils_mobilite_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_itineraireId_fkey" FOREIGN KEY ("itineraireId") REFERENCES "itineraires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_operateurId_fkey" FOREIGN KEY ("operateurId") REFERENCES "operateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trajets" ADD CONSTRAINT "trajets_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trajets" ADD CONSTRAINT "trajets_itineraireId_fkey" FOREIGN KEY ("itineraireId") REFERENCES "itineraires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empreintes_carbone" ADD CONSTRAINT "empreintes_carbone_trajetId_fkey" FOREIGN KEY ("trajetId") REFERENCES "trajets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recompenses" ADD CONSTRAINT "recompenses_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
