import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  preferredDate?: string
  concern?: string
}

const Email = ({ name, preferredDate, concern }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your appointment request at 888clinic</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>888clinic</Text>
        <Heading style={heading}>Your request is with our team</Heading>
        <Text style={text}>
          {name ? `Dear ${name},` : 'Hello,'}
        </Text>
        <Text style={text}>
          Thank you for contacting 888clinic Dermatology. Our coordinators
          will confirm your appointment slot within one working day.
        </Text>
        <Section style={card}>
          <Text style={label}>Preferred date</Text>
          <Text style={value}>{preferredDate || 'To be arranged'}</Text>
          <Text style={label}>What you asked about</Text>
          <Text style={value}>{concern || 'General consultation'}</Text>
        </Section>
        <Text style={muted}>
          If your concern is urgent, please call the clinic directly at
          +888 888 8888.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>888clinic Dermatology · 888 Wellness Avenue, Suite 12</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'We received your appointment request — 888clinic',
  displayName: 'Booking confirmation (patient)',
  previewData: {
    name: 'Jane Doe',
    preferredDate: '2026-09-02',
    concern: 'Pigmentation and skincare advice',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = {
  fontSize: '13px',
  letterSpacing: '3px',
  textTransform: 'uppercase' as const,
  color: '#9a7b3f',
  margin: '0 0 18px',
}
const heading = { fontSize: '26px', color: '#2b2b2b', margin: '0 0 20px', fontWeight: 400 }
const text = { fontSize: '15px', lineHeight: '24px', color: '#3d3d3d', margin: '0 0 14px' }
const card = {
  border: '1px solid #e6e2da',
  backgroundColor: '#faf8f4',
  padding: '18px 20px',
  margin: '20px 0',
}
const label = {
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
  color: '#8b8b8b',
  margin: '0 0 4px',
}
const value = { fontSize: '15px', color: '#2b2b2b', margin: '0 0 14px' }
const muted = { fontSize: '13px', lineHeight: '20px', color: '#6b6b6b', margin: '0' }
const hr = { borderColor: '#e6e2da', margin: '26px 0 14px' }
const footer = { fontSize: '12px', color: '#8b8b8b', margin: '0' }
