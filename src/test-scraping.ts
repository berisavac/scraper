import { searchLinks } from './scrapers/webSearch.js';
import { closeBrowser } from './browser-manager.js';

async function testScraping() {
  console.log('=== Test: searchLinks ===\n');

  const query = 'Manchester United vs Liverpool preview';
  console.log(`Query: "${query}"\n`);

  const links = await searchLinks(query);

  console.log(`\nReturned ${links.length} links`);

  await closeBrowser();
  console.log('\n=== Test complete ===');
}

testScraping().catch(console.error);
