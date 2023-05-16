import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.theater.createMany({
    data: [
      {
        name: 'Le Brady',
        allocineId: 'C0023',
        address: '39 Bd de Strasbourg, 75010 Paris',
        website: 'https://www.lebrady.fr',
      },
      {
        name: 'Max Linder Panorama',
        allocineId: 'C0089',
        address: '24 Bd Poissonnière, 75009 Paris',
        website: 'https://maxlinder.com',
      },
      {
        name: 'Le Grand Rex',
        allocineId: 'C0065',
        address: '1 Bd Poissonnière, 75002 Paris',
        website: 'https://www.legrandrex.com/cinema',
      },
      {
        name: 'Forum des images',
        allocineId: 'C0119',
        address: 'Forum des Halles, 2 rue du Cinéma 75001 Paris',
        website: 'https://www.forumdesimages.fr',
      },
      {
        name: "L'Archipel",
        allocineId: 'C0134',
        address: '17 bd de Strasbourg 75010 Paris',
        website: 'https://larchipel.net',
      },
    ],
  })

  await prisma.tag.createMany({
    data: [
      {
        name: 'Le Gand Large',
        regExp: 'grand large',
        isFilterEnabled: true,
      },
      {
        name: 'Marathon',
        regExp: 'marathon',
        isFilterEnabled: true,
      },
      {
        name: 'Oscar',
        regExp: 'oscar',
        isFilterEnabled: true,
      },
      {
        name: 'César',
        regExp: 'c&eacute;sar',
        isFilterEnabled: true,
      },
      {
        name: 'Avant-première',
        regExp: 'avant-premi',
        isFilterEnabled: true,
      },
    ],
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
