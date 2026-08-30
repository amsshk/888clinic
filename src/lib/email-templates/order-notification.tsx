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
  items?: string
  total?: string
  fulfilment?: string
  address?: string
  recurring?: string
}

const Email = ({
  name,
  email,
  phone,
  items,
  total,
  fulfilment,
  address,
  recurring,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New skincare order — 888clinic</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>888clinic · Orders</Text>
        <Heading style={heading}>New paid order</Heading>
        <Section style={card}>
          <Text style={label}>Patient</Text>
          <Text style={value}>{name || '—'}</Text>
          <Text style={label}>Email</Text>
          <Text style={value}>{email || '—'}</Text>
          <Text style={label}>Phone</Text>
          <Text style={value}>{phone || '—'}</Text>
          <Text style={label}>Items</Text>
          <Text style={value}>{items || '—'}</Text>
          <Text style={label}>Total paid</Text>
          <Text style={value}>{total || '—'}</Text>
          <Text style={label}>Fulfilment</Text>
          <Text style={value}>{fulfilment || '—'}</Text>
          {address ? (
            <>
              <Text style={label}>Delivery address</Text>
              <Text style={value}>{address}</Text>
            </>
          ) : null}
          {recurring ? (
            <>
              <Text style={label}>Refill plan</Text>
              <Text style={value}>{recurring}</Text>
            </>
          ) : null}
        </Section>
        <Text style={muted}>Mark it shipped or collected in the admin dashboard.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'New skincare order — 888clinic',
  displayName: 'Order notification (clinic)',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+66 81 234 5678',
    items: 'Retinal 0.05 Night × 2',
    total: '฿5,980',
    fulfilment: 'Delivery in Thailand',
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
