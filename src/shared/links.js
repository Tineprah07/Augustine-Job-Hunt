// Shared by the server and the browser (served at /shared/links.js).

const enc = encodeURIComponent;

/**
 * The four research links for a company.
 * The DuckDuckGo queries start with "\ ", a bang that jumps straight to the
 * top result, so they land on the company's own site rather than a results page.
 */
export function companyLinks(searchName) {
  const s = String(searchName ?? '').trim();
  return [
    {
      key: 'website',
      label: 'Website',
      url: `https://duckduckgo.com/?q=${enc(`\\ ${s} UK`)}`,
    },
    {
      key: 'careers',
      label: 'Careers',
      url: `https://duckduckgo.com/?q=${enc(`\\ ${s} careers jobs`)}`,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn jobs',
      // f_E=1,2 limits to internship + entry level.
      url: `https://www.linkedin.com/jobs/search/?keywords=${enc(s)}&f_E=1%2C2`,
    },
    {
      key: 'companies-house',
      label: 'Companies House',
      url: `https://find-and-update.company-information.service.gov.uk/search?q=${enc(s)}`,
    },
  ];
}
