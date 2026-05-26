import { seedDatabase } from './seedDatabase';

console.log('Iniciando o seeding de dados no Supabase...');
seedDatabase()
  .then((success) => {
    if (success) {
      console.log('Seeding concluído com sucesso!');
      process.exit(0);
    } else {
      console.error('Falha ao realizar seeding de dados.');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('Erro inesperado durante o seeding:', err);
    process.exit(1);
  });
