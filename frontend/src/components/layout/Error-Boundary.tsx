'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
    children:  ReactNode;
    fallback?: ReactNode;
    label?:    string;  // panel name for error message
}

interface State {
    hasError: boolean;
    message:  string;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, message: '' };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, message: error.message };
    }

    override componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`[CommandCenter] Panel error in ${this.props.label ?? 'unknown'}:`, error, info);
    }

    override render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div style={{
                    width:           '100%',
                    height:          '100%',
                    display:         'flex',
                    flexDirection:   'column',
                    alignItems:      'center',
                    justifyContent:  'center',
                    gap:             8,
                    background:      'var(--bg-raised)',
                    border:          '1px solid rgba(255,59,59,0.2)',
                    borderRadius:    8,
                    padding:         16,
                }}>
                    <span style={{ fontSize: '1.2rem', opacity: 0.5 }}>⚠</span>
                    <span style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      '0.72rem',
                        fontWeight:    600,
                        color:         'var(--severity-high)',
                    }}>
            {this.props.label ?? 'Panel'} unavailable
          </span>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '0.58rem',
                        color:         'var(--text-muted)',
                        textAlign:     'center',
                        maxWidth:      200,
                        lineHeight:    1.5,
                    }}>
            {this.state.message || 'An unexpected error occurred'}
          </span>
                    <button
                        onClick={() => this.setState({ hasError: false, message: '' })}
                        style={{
                            marginTop:     4,
                            padding:       '4px 12px',
                            background:    'var(--bg-elevated)',
                            border:        '1px solid var(--border-default)',
                            borderRadius:  5,
                            cursor:        'pointer',
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '0.58rem',
                            color:         'var(--text-secondary)',
                            outline:       'none',
                        }}
                    >
                        Retry
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}