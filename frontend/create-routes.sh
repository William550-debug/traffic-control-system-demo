#!/bin/bash
# Run from your frontend root: bash create-routes.sh
# Creates all 32 proxy route files and fixes the acknowledge typo

mkdir -p "src/app/api/alerts"
cat > "src/app/api/alerts/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/alerts');
export const POST = proxyHandler('/api/alerts');

EOF

mkdir -p "src/app/api/alerts/[id]"
cat > "src/app/api/alerts/[id]/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/alerts/[id]');

EOF

mkdir -p "src/app/api/alerts/[id]/acknowledge"
cat > "src/app/api/alerts/[id]/acknowledge/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/alerts/[id]/acknowledge');

EOF

mkdir -p "src/app/api/alerts/[id]/ignore"
cat > "src/app/api/alerts/[id]/ignore/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/alerts/[id]/ignore');

EOF

mkdir -p "src/app/api/alerts/escalate"
cat > "src/app/api/alerts/escalate/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/alerts/escalate');

EOF

mkdir -p "src/app/api/alerts/[id]/claim"
cat > "src/app/api/alerts/[id]/claim/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/alerts/[id]/claim');

EOF

mkdir -p "src/app/api/alerts/[id]/release"
cat > "src/app/api/alerts/[id]/release/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/alerts/[id]/release');

EOF

mkdir -p "src/app/api/alerts/[id]/dispatch"
cat > "src/app/api/alerts/[id]/dispatch/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/alerts/[id]/dispatch');

EOF

mkdir -p "src/app/api/incidents"
cat > "src/app/api/incidents/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/incidents');
export const POST = proxyHandler('/api/incidents');

EOF

mkdir -p "src/app/api/incidents/[id]"
cat > "src/app/api/incidents/[id]/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/incidents/[id]');

EOF

mkdir -p "src/app/api/incidents/[id]/status"
cat > "src/app/api/incidents/[id]/status/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const PATCH = proxyHandler('/api/incidents/[id]/status');

EOF

mkdir -p "src/app/api/incidents/[id]/confirm"
cat > "src/app/api/incidents/[id]/confirm/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/incidents/[id]/confirm');

EOF

mkdir -p "src/app/api/incidents/[id]/escalate"
cat > "src/app/api/incidents/[id]/escalate/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/incidents/[id]/escalate');

EOF

mkdir -p "src/app/api/incidents/[id]/resolve"
cat > "src/app/api/incidents/[id]/resolve/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/incidents/[id]/resolve');

EOF

mkdir -p "src/app/api/incidents/[id]/traffic/reroute"
cat > "src/app/api/incidents/[id]/traffic/reroute/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/incidents/[id]/traffic/reroute');

EOF

mkdir -p "src/app/api/incidents/[id]/signals/adjust"
cat > "src/app/api/incidents/[id]/signals/adjust/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/incidents/[id]/signals/adjust');

EOF

mkdir -p "src/app/api/incidents/[id]/recommendations/[recId]/approve"
cat > "src/app/api/incidents/[id]/recommendations/[recId]/approve/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/incidents/[id]/recommendations/[recId]/approve');

EOF

mkdir -p "src/app/api/incidents/[id]/recommendations/[recId]/reject"
cat > "src/app/api/incidents/[id]/recommendations/[recId]/reject/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/incidents/[id]/recommendations/[recId]/reject');

EOF

mkdir -p "src/app/api/incidents/[id]/responders/[rspId]/dispatch"
cat > "src/app/api/incidents/[id]/responders/[rspId]/dispatch/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/incidents/[id]/responders/[rspId]/dispatch');

EOF

mkdir -p "src/app/api/incidents/[id]/responders/[rspId]/route"
cat > "src/app/api/incidents/[id]/responders/[rspId]/route/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const PATCH = proxyHandler('/api/incidents/[id]/responders/[rspId]/route');

EOF

mkdir -p "src/app/api/corridors"
cat > "src/app/api/corridors/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/corridors');

EOF

mkdir -p "src/app/api/corridors/[id]/timing"
cat > "src/app/api/corridors/[id]/timing/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const PATCH = proxyHandler('/api/corridors/[id]/timing');

EOF

mkdir -p "src/app/api/corridors/[id]/lock"
cat > "src/app/api/corridors/[id]/lock/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/corridors/[id]/lock');

EOF

mkdir -p "src/app/api/corridors/[id]/unlock"
cat > "src/app/api/corridors/[id]/unlock/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/corridors/[id]/unlock');

EOF

mkdir -p "src/app/api/audit"
cat > "src/app/api/audit/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/audit');
export const POST = proxyHandler('/api/audit');

EOF

mkdir -p "src/app/api/recommendations"
cat > "src/app/api/recommendations/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/recommendations');

EOF

mkdir -p "src/app/api/recommendations/[id]/approve"
cat > "src/app/api/recommendations/[id]/approve/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/recommendations/[id]/approve');

EOF

mkdir -p "src/app/api/recommendations/[id]/reject"
cat > "src/app/api/recommendations/[id]/reject/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/recommendations/[id]/reject');

EOF

mkdir -p "src/app/api/health"
cat > "src/app/api/health/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/health');

EOF

mkdir -p "src/app/api/predictive"
cat > "src/app/api/predictive/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/predictive');

EOF

mkdir -p "src/app/api/predictive/hotspots"
cat > "src/app/api/predictive/hotspots/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/predictive/hotspots');

EOF

mkdir -p "src/app/api/predictive/forecast"
cat > "src/app/api/predictive/forecast/route.ts" << 'EOF'
import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/predictive/forecast');

EOF

# Fix the typo: acknowlegde → acknowledge
[ -d "src/app/api/alerts/[id]/acknowlegde" ] && \
  mv "src/app/api/alerts/[id]/acknowlegde" "src/app/api/alerts/[id]/acknowledge" && \
  echo "Fixed: acknowledge typo renamed"

echo ""
echo "Done — $(find src/app/api -name route.ts | wc -l) route files in place"
echo "Verify with: curl http://localhost:3000/api/alerts"