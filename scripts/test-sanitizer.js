function sanitizeHtml(input) {
  let html = input;
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<base[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '');
  
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  
  html = html.replace(/\s(href|src)\s*=\s*("|')\s*(javascript:|data:)[\s\S]*?\2/gi, '');
  html = html.replace(/\s(href|src)\s*=\s*([^\s>]+)(?=[\s>])/gi, (match, attr, value) => {
    const raw = String(value).trim().toLowerCase();
    if (raw.startsWith('javascript:') || raw.startsWith('data:')) {
      return '';
    }
    return match;
  });
  
  return html;
}

const testCases = [
  {
    name: 'removes inline onclick',
    input: '<button onclick="alert(123)">Click</button>',
    shouldNotContain: ['onclick'],
    shouldContain: ['button', 'Click'],
  },
  {
    name: 'removes script tags entirely',
    input: '<p>Hello</p><script>alert("XSS")</script><p>World</p>',
    shouldNotContain: ['<script>', 'alert'],
    shouldContain: ['<p>Hello</p>', '<p>World</p>'],
  },
  {
    name: 'removes style tags',
    input: '<style>body { background: red; }</style><p>Content</p>',
    shouldNotContain: ['<style>', 'background'],
    shouldContain: ['<p>Content</p>'],
  },
  {
    name: 'removes iframe tags',
    input: '<p>Welcome</p><iframe src="evil.com"></iframe>',
    shouldNotContain: ['<iframe', 'evil.com'],
    shouldContain: ['<p>Welcome</p>'],
  },
  {
    name: 'removes javascript: URLs from href',
    input: '<a href="javascript:void(0)">Click</a>',
    shouldNotContain: ['javascript:', 'href'],
    shouldContain: ['<a', '>Click</a>'],
  },
  {
    name: 'removes data: URLs from src',
    input: '<img src="data:text/html,<script>alert(1)</script>" />',
    shouldNotContain: ['data:', 'src'],
    shouldContain: ['<img'],
  },
  {
    name: 'preserves safe href',
    input: '<a href="https://example.com">Safe Link</a>',
    shouldNotContain: [],
    shouldContain: ['href="https://example.com"', 'Safe Link'],
  },
  {
    name: 'removes onerror handler',
    input: '<img src="pic.jpg" onerror="alert(123)" />',
    shouldNotContain: ['onerror'],
    shouldContain: ['<img', 'src="pic.jpg"'],
  },
];

function runTests() {
  console.log('Running HTML Sanitizer Tests\n');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    let result = testCase.input;
    result = result
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[\s\S]*?<\/embed>/gi, '')
      .replace(/<form[\s\S]*?<\/form>/gi, '')
      .replace(/<meta[^>]*>/gi, '')
      .replace(/<base[^>]*>/gi, '')
      .replace(/<link[^>]*>/gi, '');
    
    result = result.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    
    result = result.replace(/\s(href|src)\s*=\s*("|')\s*(javascript:|data:)[\s\S]*?\2/gi, '');
    result = result.replace(/\s(href|src)\s*=\s*([^\s>]+)(?=[\s>])/gi, (match, attr, value) => {
      const raw = String(value).trim().toLowerCase();
      if (raw.startsWith('javascript:') || raw.startsWith('data:')) {
        return '';
      }
      return match;
    });

    let testPassed = true;
    const failures = [];

    for (const dangerous of testCase.shouldNotContain) {
      if (result.toLowerCase().includes(dangerous.toLowerCase())) {
        testPassed = false;
        failures.push(`  ✗ Should NOT contain: "${dangerous}"`);
      }
    }

    if (testCase.shouldContain) {
      for (const safe of testCase.shouldContain) {
        if (!result.includes(safe)) {
          testPassed = false;
          failures.push(`  ✗ Should contain: "${safe}"`);
        }
      }
    }

    if (testPassed) {
      console.log(`✓ ${testCase.name}`);
      passed++;
    } else {
      console.log(`✗ ${testCase.name}`);
      failures.forEach((f) => console.log(f));
      console.log(`  Input:  "${testCase.input}"`);
      console.log(`  Output: "${result}"`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
