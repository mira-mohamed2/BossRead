import { sanitizeHtml } from './sanitizeHtml';

interface TestCase {
  name: string;
  input: string;
  shouldNotContain: string[];
  shouldContain?: string[];
}

const testCases: TestCase[] = [
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
  {
    name: 'removes form tags',
    input: '<form action="/evil"><input type="text" /></form>',
    shouldNotContain: ['<form', '</form>', 'action'],
    shouldContain: ['input'],
  },
  {
    name: 'preserves safe HTML structure',
    input: '<article><h1>Title</h1><p>Content with <strong>bold</strong>.</p></article>',
    shouldNotContain: [],
    shouldContain: ['<article>', '<h1>Title</h1>', '<strong>bold</strong>', '</article>'],
  },
  {
    name: 'removes embedded meta tags',
    input: '<meta name="viewport" content="width=device-width" /><p>Text</p>',
    shouldNotContain: ['<meta'],
    shouldContain: ['<p>Text</p>'],
  },
  {
    name: 'removes embed tags',
    input: '<embed src="malicious.swf" /><p>Safe</p>',
    shouldNotContain: ['<embed'],
    shouldContain: ['<p>Safe</p>'],
  },
];

function runTests(): void {
  console.log('Running HTML Sanitizer Tests\n');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = sanitizeHtml(testCase.input);

    let testPassed = true;
    const failures: string[] = [];

    // Check that dangerous content is removed
    for (const dangerous of testCase.shouldNotContain) {
      if (result.toLowerCase().includes(dangerous.toLowerCase())) {
        testPassed = false;
        failures.push(`  ✗ Should NOT contain: "${dangerous}"`);
      }
    }

    // Check that safe content is preserved
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

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
