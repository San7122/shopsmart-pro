#!/bin/bash

# ============================================================
# ShopSmart Pro - Automated Backup Script
# Run via cron: 0 2 * * * /path/to/backup.sh
# ============================================================

set -e

# Configuration
BACKUP_DIR="/backups/shopsmart"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/shopsmart-backup.log"

# MongoDB Configuration
MONGO_HOST=${MONGO_HOST:-"localhost"}
MONGO_PORT=${MONGO_PORT:-"27017"}
MONGO_USER=${MONGO_USER:-"admin"}
MONGO_PASSWORD=${MONGO_PASSWORD:-"password"}
MONGO_DB=${MONGO_DB:-"shopsmart-pro"}

# S3 Configuration (optional)
S3_BUCKET=${S3_BUCKET:-""}
AWS_REGION=${AWS_REGION:-"ap-south-1"}

# Slack Webhook (optional)
SLACK_WEBHOOK=${SLACK_WEBHOOK:-""}

# ============================================================
# FUNCTIONS
# ============================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

send_slack() {
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$1\"}" \
            $SLACK_WEBHOOK > /dev/null
    fi
}

cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete
    log "Cleanup completed"
}

backup_mongodb() {
    log "Starting MongoDB backup..."
    
    MONGO_BACKUP_DIR="$BACKUP_DIR/mongodb_$DATE"
    mkdir -p $MONGO_BACKUP_DIR
    
    mongodump \
        --host=$MONGO_HOST \
        --port=$MONGO_PORT \
        --username=$MONGO_USER \
        --password=$MONGO_PASSWORD \
        --authenticationDatabase=admin \
        --db=$MONGO_DB \
        --out=$MONGO_BACKUP_DIR \
        --gzip
    
    # Create archive
    MONGO_ARCHIVE="$BACKUP_DIR/mongodb_$DATE.tar.gz"
    tar -czf $MONGO_ARCHIVE -C $BACKUP_DIR mongodb_$DATE
    rm -rf $MONGO_BACKUP_DIR
    
    MONGO_SIZE=$(du -h $MONGO_ARCHIVE | cut -f1)
    log "MongoDB backup completed: $MONGO_ARCHIVE ($MONGO_SIZE)"
    
    echo $MONGO_ARCHIVE
}

backup_redis() {
    log "Starting Redis backup..."
    
    REDIS_BACKUP="$BACKUP_DIR/redis_$DATE.rdb"
    
    # Trigger Redis BGSAVE
    redis-cli BGSAVE
    sleep 5
    
    # Copy dump file
    cp /var/lib/redis/dump.rdb $REDIS_BACKUP 2>/dev/null || \
    cp /data/dump.rdb $REDIS_BACKUP 2>/dev/null || \
    log "Warning: Could not find Redis dump file"
    
    if [ -f "$REDIS_BACKUP" ]; then
        gzip $REDIS_BACKUP
        REDIS_SIZE=$(du -h $REDIS_BACKUP.gz | cut -f1)
        log "Redis backup completed: $REDIS_BACKUP.gz ($REDIS_SIZE)"
        echo "$REDIS_BACKUP.gz"
    fi
}

backup_uploads() {
    log "Starting uploads backup..."
    
    UPLOADS_BACKUP="$BACKUP_DIR/uploads_$DATE.tar.gz"
    UPLOADS_DIR=${UPLOADS_DIR:-"/app/uploads"}
    
    if [ -d "$UPLOADS_DIR" ]; then
        tar -czf $UPLOADS_BACKUP $UPLOADS_DIR
        UPLOADS_SIZE=$(du -h $UPLOADS_BACKUP | cut -f1)
        log "Uploads backup completed: $UPLOADS_BACKUP ($UPLOADS_SIZE)"
        echo $UPLOADS_BACKUP
    else
        log "Warning: Uploads directory not found"
    fi
}

backup_config() {
    log "Starting config backup..."
    
    CONFIG_BACKUP="$BACKUP_DIR/config_$DATE.tar.gz"
    CONFIG_FILES=(
        "/app/.env"
        "/app/docker-compose.yml"
        "/etc/nginx/nginx.conf"
    )
    
    tar -czf $CONFIG_BACKUP ${CONFIG_FILES[@]} 2>/dev/null || true
    
    if [ -f "$CONFIG_BACKUP" ]; then
        CONFIG_SIZE=$(du -h $CONFIG_BACKUP | cut -f1)
        log "Config backup completed: $CONFIG_BACKUP ($CONFIG_SIZE)"
        echo $CONFIG_BACKUP
    fi
}

upload_to_s3() {
    if [ -n "$S3_BUCKET" ]; then
        log "Uploading to S3..."
        
        for file in "$@"; do
            if [ -f "$file" ]; then
                aws s3 cp $file s3://$S3_BUCKET/backups/$(basename $file) \
                    --region $AWS_REGION
                log "Uploaded to S3: $(basename $file)"
            fi
        done
        
        log "S3 upload completed"
    fi
}

verify_backup() {
    log "Verifying backups..."
    
    for file in "$@"; do
        if [ -f "$file" ]; then
            # Check file is not empty
            if [ -s "$file" ]; then
                log "✓ Verified: $(basename $file)"
            else
                log "✗ Empty file: $(basename $file)"
                return 1
            fi
        else
            log "✗ Missing file: $file"
            return 1
        fi
    done
    
    log "All backups verified successfully"
    return 0
}

# ============================================================
# MAIN EXECUTION
# ============================================================

main() {
    log "============================================"
    log "Starting ShopSmart Pro backup process"
    log "============================================"
    
    START_TIME=$(date +%s)
    
    # Create backup directory
    mkdir -p $BACKUP_DIR
    
    # Perform backups
    MONGO_FILE=$(backup_mongodb)
    REDIS_FILE=$(backup_redis)
    UPLOADS_FILE=$(backup_uploads)
    CONFIG_FILE=$(backup_config)
    
    # Collect all backup files
    BACKUP_FILES=($MONGO_FILE $REDIS_FILE $UPLOADS_FILE $CONFIG_FILE)
    
    # Verify backups
    if verify_backup ${BACKUP_FILES[@]}; then
        # Upload to S3
        upload_to_s3 ${BACKUP_FILES[@]}
        
        # Cleanup old backups
        cleanup_old_backups
        
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        
        # Calculate total size
        TOTAL_SIZE=$(du -ch ${BACKUP_FILES[@]} 2>/dev/null | grep total | cut -f1)
        
        log "============================================"
        log "Backup completed successfully!"
        log "Duration: ${DURATION}s"
        log "Total size: $TOTAL_SIZE"
        log "============================================"
        
        send_slack "✅ ShopSmart Pro backup completed successfully! Duration: ${DURATION}s, Size: $TOTAL_SIZE"
        
        exit 0
    else
        log "============================================"
        log "Backup verification failed!"
        log "============================================"
        
        send_slack "❌ ShopSmart Pro backup failed! Check logs for details."
        
        exit 1
    fi
}

# Run main function
main "$@"
