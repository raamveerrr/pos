# Restaurant POS System - Deployment Guide

This guide covers deploying the Restaurant POS system to production using Vercel (frontend) and Supabase (backend).

## Prerequisites

- Node.js 18+ installed
- A Vercel account
- A Supabase account
- Razorpay account for payment processing

## 1. Supabase Setup

### Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project
4. Wait for the project to initialize

### Database Setup

1. In your Supabase dashboard, go to the SQL Editor
2. Run the migration files in order:
   ```sql
   -- Copy contents of supabase/migrations/20250907230141_tender_glitter.sql
   -- Copy contents of supabase/migrations/20250907230219_dry_frost.sql
   ```

### Authentication Settings

1. Go to Authentication → Settings
2. Configure email settings:
   - Disable "Confirm email" (for demo purposes)
   - Set Site URL to your production domain
3. Add your domain to "Additional Redirect URLs"

### Storage Setup

1. Go to Storage
2. Create a bucket named "images"
3. Set bucket to public
4. Create folders: `menu-items/`, `restaurants/`

### Edge Functions Deployment

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Deploy edge function:
   ```bash
   supabase functions deploy create-payment
   ```

### Environment Variables (Supabase)

Set these secrets in Supabase Dashboard → Project Settings → Edge Functions:

```bash
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

## 2. Razorpay Setup

1. Create a Razorpay account at [https://razorpay.com](https://razorpay.com)
2. Go to Dashboard → Settings → API Keys
3. Generate/copy your Key ID and Key Secret
4. Add webhook endpoints in Dashboard → Settings → Webhooks:
   - URL: `https://your-project.supabase.co/functions/v1/create-payment`
   - Events: `payment.captured`, `payment.failed`

## 3. Vercel Deployment

### Environment Variables

Create a `.env.local` file or set in Vercel dashboard:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Razorpay (public key only - secret goes to Supabase)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### Deploy to Vercel

#### Option 1: Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts and set environment variables

#### Option 2: Using Git Integration

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Import Project"
4. Connect your GitHub repository
5. Set environment variables in the deployment settings
6. Deploy

### Build Configuration

Vercel should auto-detect Next.js. If needed, configure:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

## 4. Domain Setup

### Custom Domain (Vercel)

1. In Vercel dashboard, go to your project
2. Go to Settings → Domains
3. Add your custom domain
4. Configure DNS records as instructed

### SSL Certificate

Vercel automatically provides SSL certificates for all domains.

## 5. Monitoring and Analytics

### Vercel Analytics

1. In Vercel dashboard, go to your project
2. Enable Analytics in the project settings
3. Add the analytics script to your app if needed

### Supabase Monitoring

1. Monitor database performance in Supabase dashboard
2. Set up alerts for high usage
3. Monitor edge function logs

## 6. Production Checklist

### Security

- [ ] All environment variables are set correctly
- [ ] Row Level Security (RLS) is enabled on all tables
- [ ] API keys are not exposed in frontend code
- [ ] HTTPS is enforced
- [ ] CORS is configured properly

### Performance

- [ ] Database indexes are optimized
- [ ] Images are compressed and optimized
- [ ] Edge functions are deployed
- [ ] CDN is configured (automatic with Vercel)

### Testing

- [ ] All environment variables work
- [ ] Authentication flows work
- [ ] Payment processing works
- [ ] Real-time features work
- [ ] Mobile responsiveness is tested
- [ ] Cross-browser compatibility checked

### Monitoring

- [ ] Error tracking is set up
- [ ] Performance monitoring is enabled
- [ ] Database monitoring is configured
- [ ] Backup strategy is in place

## 7. Post-Deployment Setup

### Initial Data

1. Create demo restaurant data
2. Add sample menu items
3. Set up initial user accounts with different roles
4. Configure initial table layouts

### User Management

1. Create admin accounts
2. Set up user roles and permissions
3. Configure email templates for user invitations

## 8. Maintenance

### Regular Tasks

- Monitor database growth and optimize queries
- Update dependencies regularly
- Review and rotate API keys
- Monitor payment processing and handle failures
- Backup critical data

### Updates

1. Test all changes in staging environment
2. Use Vercel's preview deployments for testing
3. Monitor edge function logs after deployments
4. Update database migrations if needed

## 9. Troubleshooting

### Common Issues

**Build Failures:**
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check environment variables

**Database Connection Issues:**
- Verify Supabase URL and keys
- Check RLS policies
- Ensure proper table relationships

**Payment Processing Issues:**
- Verify Razorpay keys in both frontend and edge function
- Check webhook endpoints
- Monitor edge function logs

**Real-time Features Not Working:**
- Check Supabase real-time configuration
- Verify WebSocket connections
- Check browser console for errors

### Support Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Razorpay Documentation](https://razorpay.com/docs)

## 10. Scaling Considerations

### Database Scaling

- Monitor database performance metrics
- Consider read replicas for high-traffic applications
- Optimize queries and add proper indexes
- Archive old data to keep tables lean

### Application Scaling

- Use Vercel's edge functions for global performance
- Implement proper caching strategies
- Consider database connection pooling
- Monitor and optimize bundle sizes

### Cost Optimization

- Monitor Supabase usage and optimize queries
- Use Vercel's analytics to optimize performance
- Implement proper caching to reduce API calls
- Consider upgrading plans based on actual usage

---

Your Restaurant POS system is now ready for production! 🚀

For questions or issues, refer to the documentation links above or check the project's GitHub issues.