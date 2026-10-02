import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { ThemeToggle, Logo } from '../components';
import * as api from '../api';
import { GraduationCap, BookOpen, Shield, Clock, BarChart3, Users, CheckCircle2, ArrowRight, Star, ChevronRight } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, user } = useApp();
  const navigate = useNavigate();
  const [hasPrincipal, setHasPrincipal] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'student') navigate('/student');
      else if (user.role === 'teacher') navigate('/teacher');
      else if (user.role === 'principal') navigate('/principal');
    }
    (async () => {
      const principals = await api.getUsersByRole('principal');
      setHasPrincipal(principals.length > 0);
    })();
  }, [isAuthenticated, user]);

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <header className="bg-theme-card border-b border-theme sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo />
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-theme-secondary hover:text-indigo-600">Features</a>
              <a href="#about" className="text-sm text-theme-secondary hover:text-indigo-600">About</a>
              <a href="#contact" className="text-sm text-theme-secondary hover:text-indigo-600">Contact</a>
            </nav>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link to="/register" className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">Register</Link>
              <Link to="/student/login" className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">Student Login</Link>
              <Link to="/staff/login" className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-theme-secondary bg-theme-tertiary rounded-lg hover:bg-theme-border">Staff Login</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-theme-primary to-purple-50 dark:from-indigo-950/20 dark:via-theme-primary dark:to-purple-950/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-full text-sm text-indigo-700 dark:text-indigo-300 mb-6">
              <Star className="w-4 h-4" /> Professional Online Examination Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-theme-primary leading-tight">
              Elevate Your Academic
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> Assessment</span> Standards
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-theme-secondary max-w-2xl mx-auto leading-relaxed">
              Superior Test provides schools and colleges with a comprehensive, secure, and intelligent platform for creating, managing, and analyzing examinations.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
                Student Registration <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link to="/student/login" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-indigo-600 bg-white dark:bg-theme-card border-2 border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                Student Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-theme-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-theme-primary">Powerful Features</h2>
            <p className="mt-4 text-lg text-theme-secondary">Everything you need to manage examinations efficiently and securely.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: 'Smart Test Creation', desc: 'Paste MCQs in any format. Our intelligent parser handles various styles automatically.' },
              { icon: Shield, title: 'Secure Testing', desc: 'Anti-cheating measures, tab detection, auto-save, fullscreen mode, and server-side validation.' },
              { icon: Clock, title: 'Flexible Scheduling', desc: 'Configurable timers, auto-submission, multiple attempts, and negative marking.' },
              { icon: BarChart3, title: 'Analytics & Reports', desc: 'Performance charts, class analytics, and exportable reports in PDF, Excel, and CSV.' },
              { icon: Users, title: 'Role Management', desc: 'Principal, Teacher, and Student roles with granular permissions and audit logging.' },
              { icon: GraduationCap, title: 'Question Bank', desc: 'Reusable question bank organized by subject, class, chapter, and difficulty level.' },
            ].map((f, i) => (
              <div key={i} className="group p-6 bg-theme-card border border-theme-card rounded-2xl hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50">
                  <f.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-theme-primary mb-2">{f.title}</h3>
                <p className="text-theme-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 bg-theme-primary">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-theme-primary">About Superior Test</h2>
          <p className="mt-6 text-lg text-theme-secondary leading-relaxed">
            Superior Test is a comprehensive online examination management platform designed for schools, colleges, and educational institutions. 
            We provide a secure, reliable, and feature-rich environment for creating assessments, managing examinations, and tracking academic performance.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to Get Started?</h2>
          <p className="mt-4 text-lg text-indigo-100">Register as a student or contact your institution's administrator.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-indigo-600 bg-white rounded-xl hover:bg-gray-50 shadow-lg">
              Register Now <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
            {hasPrincipal === false && (
              <Link to="/setup" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10">
                Setup Principal Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold">Superior Test</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} Superior Test. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
