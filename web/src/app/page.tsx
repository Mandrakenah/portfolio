import { Hero } from '@/components/home/Hero'
import { About } from '@/components/home/About'
import { Work } from '@/components/home/Work'
import { Experience } from '@/components/home/Experience'
import { Skills } from '@/components/home/Skills'
import { LabTeaser } from '@/components/home/LabTeaser'
import { Footer } from '@/components/chrome/Footer'

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Work />
      <Experience />
      <Skills />
      <LabTeaser />
      <Footer />
    </main>
  )
}
