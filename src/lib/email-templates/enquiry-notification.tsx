import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  email?: string
  phone?: string
  preferredDate?: string
  concern?: string
}

const Email = ({ name, email, phone, preferredDate, concern }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New appointment request{name ? ` from ${name}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>888clinic · Clinic inbox</Text>
        <Heading style={heading}>New appointment request</Heading>
        <Section style={card}>
          <Text style={row}><strong>Name:</strong> {name || '—'}</Text>
          <Text style={row}><strong>Email:</strong> {email || '—'}</Text>
          <Text style={row}><strong>Phone:</strong> {phone || '—'}</Text>
          <Text style={row}><strong>Preferred date:</strong> {preferredDate || '—'}</Text>
          <Text style={row}><strong>Concern:</strong> {concern || '—'}</Text>
        </Section>
        <Text style={muted}>Manage this request in the admin inbox.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'New appointment request — 888clinic',
  displayName: 'Enquiry notification (clinic)',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+888 111 2222',
    preferredDate: '2026-09-02',
    concern: 'Mole check',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = {
  fontSize: '12px',
  letterSpacing: '2.5px',
  textTransform: 'uppercase' as const,
  color: '#9a7b3f',
  margin: '0 0 16px',
}
const heading = { fontSize: '24px', color: '#2b2b2b', margin: '0 0 18px', fontWeight: 400 }
const card = {
  border: '1px solid #e6e2da',
  backgroundColor: '#faf8f4',
  padding: '18px 20px',
  margin: '0 0 18px',
}
const row = { fontSize: '15px', lineHeight: '24px', color: '#3d3d3d', margin: '0 0 8px' }
const muted = { fontSize: '13px', color: '#6b6b6b', margin: '0' }
