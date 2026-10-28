import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			'primary-text': 'hsl(var(--primary-text))',
  			amber: 'hsl(var(--amber))',
  			success: 'hsl(var(--success))',
  			warning: 'hsl(var(--warning))',
  			info: 'hsl(var(--info))',
  			track: 'hsl(var(--track))',
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: '0.75rem',
  			'2xl': '1rem',
  			'3xl': '1.5rem'
  		},
  		transitionTimingFunction: {
  			smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  			'out-expo': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  			collapse: 'cubic-bezier(0.87, 0, 0.13, 1)'
  		},
  		backgroundImage: {
  			'card-surface': 'var(--card-gradient)',
  			'card-rim': 'var(--card-rim)',
  			'panel-glass': 'var(--panel-glass)',
  			'cta-gradient': 'var(--cta-gradient)',
  			'stat-bar': 'var(--stat-bar-gradient)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'bar-in': {
  				from: {
  					transform: 'scaleX(0)'
  				}
  			},
  			flame: {
  				'0%, 100%': {
  					transform: 'scale(1)'
  				},
  				'50%': {
  					transform: 'scale(1.12)'
  				}
  			},
  			'glow-pulse': {
  				'0%, 100%': {
  					opacity: '0.35'
  				},
  				'50%': {
  					opacity: '0.8'
  				}
  			},
  			'pop-in': {
  				from: {
  					opacity: '0',
  					transform: 'scale(0.9)'
  				}
  			},
  			'fade-up': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(12px)'
  				}
  			},
  			shine: {
  				'0%': { transform: 'translateX(-120%)' },
  				'60%, 100%': { transform: 'translateX(220%)' }
  			},
  			'pulse-soft': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.5' }
  			},
  			'ring-draw': {
  				from: {
  					'stroke-dashoffset': '283'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.3s cubic-bezier(0.87, 0, 0.13, 1)',
  			'accordion-up': 'accordion-up 0.3s cubic-bezier(0.87, 0, 0.13, 1)',
  			'fade-up': 'fade-up 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) both',
  			'bar-in': 'bar-in 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both',
  			flame: 'flame 2.2s ease-in-out infinite',
  			'glow-pulse': 'glow-pulse 3.4s ease-in-out infinite',
  			shine: 'shine 3s ease-in-out infinite',
  			'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'pop-in': 'pop-in 0.4s both',
  			'ring-draw': 'ring-draw 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) both'
  		},
  		fontFamily: {
  			sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji'],
  			serif: ['Inter', 'ui-serif', 'Georgia', 'serif'],
  			mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)',
  			glow: '0 0 24px -4px var(--accent-glow)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
