import './globals.css';

export const metadata = {
  title: 'SpeedEngine AI | Automated Shadow Page Speed Optimizer',
  description: 'Boost your website Lighthouse performance dynamically. Optimize LCP, TBT, and CLS using interactive script delaying and LLM-powered layout repairs.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
